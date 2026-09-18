import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * O protocolo do webhook da Cloud API do WhatsApp: verificação e assinatura.
 *
 * Separado da rota pelo mesmo motivo do 99Food — são as duas regras que a
 * plataforma cobra e que quebram em silêncio, e merecem existir sozinhas,
 * testáveis, longe do roteamento do Next.
 *
 * As diferenças em relação ao 99Food, que mudam o desenho:
 *
 * 1. **Tem um aperto de mão.** Antes de mandar qualquer evento, a Meta faz um
 *    `GET` no nosso endereço com um desafio, e só assina a inscrição se a
 *    resposta for exatamente o desafio em texto puro. Endpoint que não passa
 *    nisso não recebe evento nenhum — e não há mensagem de erro dizendo isso.
 *
 * 2. **A assinatura é HMAC-SHA256**, não MD5, e vem prefixada com `sha256=`.
 *
 * 3. **A resposta é o status HTTP**, não um `errno` no corpo. Qualquer coisa
 *    fora de 2xx faz a Meta reenviar.
 */

/* ---------------------------------------------------------------- */
/* 1. O aperto de mão                                                */
/* ---------------------------------------------------------------- */

/** O que responder ao `GET` de verificação. */
export type Verificacao =
  | { ok: true; desafio: string }
  | { ok: false; motivo: string };

/**
 * Confere o desafio de inscrição do webhook.
 *
 * O `hub.verify_token` é uma senha que NÓS escolhemos e cadastramos no painel
 * da Meta; ela volta aqui para provar que quem está chamando leu o cadastro. A
 * comparação é em tempo constante porque um `===` vaza, pelo tempo de resposta,
 * quantos caracteres iniciais bateram — e este endereço é público.
 *
 * O desafio é devolvido para quem chama responder **em texto puro**. Embrulhar
 * em JSON é o erro clássico aqui: a Meta compara a resposta byte a byte e
 * recusa a inscrição sem dizer por quê.
 */
export function verificarInscricao(
  params: URLSearchParams,
  tokenEsperado: string,
): Verificacao {
  if (params.get('hub.mode') !== 'subscribe') {
    return { ok: false, motivo: 'modo inesperado' };
  }

  const recebido = params.get('hub.verify_token');
  if (!recebido || !iguais(recebido, tokenEsperado)) {
    return { ok: false, motivo: 'verify_token não confere' };
  }

  const desafio = params.get('hub.challenge');
  if (!desafio) return { ok: false, motivo: 'sem desafio' };

  return { ok: true, desafio };
}

/* ---------------------------------------------------------------- */
/* 2. A assinatura                                                   */
/* ---------------------------------------------------------------- */

/**
 * Confere que quem chamou foi mesmo a Meta.
 *
 * `HMAC-SHA256(corpo_cru, app_secret)`, hexadecimal, no header
 * `x-hub-signature-256`, prefixado com `sha256=`.
 *
 * O corpo tem que ser o **cru**. Reserializar depois de um parse muda espaço e
 * ordem de chave, e a assinatura passa a falhar sempre — por um motivo que não
 * aparece em log nenhum.
 */
export function assinaturaConfere(
  raw: string,
  recebida: string | null,
  appSecret: string,
): boolean {
  if (!recebida) return false;

  const esperada = createHmac('sha256', appSecret).update(raw, 'utf8').digest('hex');

  // O prefixo é parte do formato deles; aceitar sem ele seria aceitar um
  // formato que a Meta nunca manda.
  const semPrefixo = recebida.trim().toLowerCase().replace(/^sha256=/, '');

  return iguais(esperada, semPrefixo);
}

/** Comparação em tempo constante, tolerante a tamanhos diferentes. */
function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ---------------------------------------------------------------- */
/* 3. O corpo do evento                                              */
/* ---------------------------------------------------------------- */

/**
 * Uma mensagem recebida, já sem o embrulho.
 *
 * A Cloud API aninha em quatro níveis (`entry[] → changes[] → value →
 * messages[]`) e manda várias mensagens por requisição. Quem consome não
 * deveria ter que saber disso.
 */
export interface MensagemRecebida {
  /** Id da mensagem na Meta. É com ele que se marca como lida e se deduplica. */
  id: string;
  /** Telefone de quem mandou, em E.164 sem o `+`. */
  de: string;
  /** O nome do contato no WhatsApp, quando a Meta manda. */
  nome: string | null;
  /** `text`, `image`, `audio`, `interactive`, `button`… */
  tipo: string;
  /** O texto, quando o tipo tem texto. Botão e lista trazem o rótulo escolhido. */
  texto: string | null;
  /**
   * O `id` da opção tocada, quando foi botão ou lista.
   *
   * É NOSSO: escolhemos ao montar a mensagem, e ele volta intacto. Por isso é
   * aqui que viaja o contexto — qual loja, qual pedido. Ler só o rótulo obriga
   * a adivinhar a intenção pelo estado da conversa, e o estado erra: o cliente
   * responde um botão de dez minutos atrás, quando já está falando com outra
   * loja, e o "Confirmar" dele cairia na cozinha errada.
   *
   * Nulo em mensagem digitada.
   */
  opcaoId: string | null;
  /** Quando foi enviada. */
  em: Date;
  /** O número da LOJA que recebeu — é ele que diz de qual estabelecimento é. */
  paraNumeroId: string;
}

/**
 * O que aconteceu com uma mensagem que NÓS enviamos.
 *
 * A Cloud API responde 200 quando ACEITA a mensagem — não quando o cliente
 * recebe. Entrega, leitura e falha chegam depois, por este caminho. Descartar
 * isto deixa o sistema achando que falou quando não falou, que foi exatamente
 * como se perdeu a primeira mensagem de teste do Levô.
 */
export interface StatusDeEnvio {
  /** O `wamid` da mensagem que saiu. */
  id: string;
  /** `sent`, `delivered`, `read` ou `failed`. */
  status: string;
  /** Para quem. */
  para: string;
  /** Preenchido só em `failed` — e é a única pista de POR QUE não chegou. */
  erro: { code?: number; titulo?: string; detalhe?: string } | null;
  em: Date;
}

interface EnvelopeMeta {
  object?: string;
  entry?: {
    id?: string;
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        statuses?: {
          id?: string;
          status?: string;
          recipient_id?: string;
          timestamp?: string;
          errors?: { code?: number; title?: string; error_data?: { details?: string } }[];
        }[];
        messages?: {
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          button?: { text?: string; payload?: string };
          interactive?: {
            button_reply?: { id?: string; title?: string };
            list_reply?: { id?: string; title?: string };
          };
          location?: { latitude?: number; longitude?: number; name?: string; address?: string };
          image?: { caption?: string };
        }[];
      };
    }[];
  }[];
}

/**
 * Achata o envelope da Meta nas mensagens que ele carrega.
 *
 * Devolve lista vazia — e não erro — para evento que não é mensagem. A mesma
 * inscrição entrega recibo de entrega, mudança de status e atualização de
 * template, e tratar isso como falha faria a Meta reenviar para sempre um
 * evento que está perfeito.
 */
export function mensagensDoEvento(corpo: unknown): MensagemRecebida[] {
  const envelope = corpo as EnvelopeMeta;
  const saida: MensagemRecebida[] = [];

  for (const entry of envelope?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const valor = change.value;
      if (!valor) continue;

      const numeroDaLoja = valor.metadata?.phone_number_id;
      if (!numeroDaLoja) continue;

      /*
       * O nome do contato vem numa lista separada das mensagens, ligada pelo
       * telefone. Um índice evita varrer `contacts` a cada mensagem — e o
       * cliente que manda três mensagens seguidas aparece uma vez só ali.
       */
      const nomePorTelefone = new Map<string, string>();
      for (const contato of valor.contacts ?? []) {
        const nome = contato.profile?.name?.trim();
        if (contato.wa_id && nome) nomePorTelefone.set(contato.wa_id, nome);
      }

      for (const msg of valor.messages ?? []) {
        if (!msg.id || !msg.from) continue;

        saida.push({
          id: msg.id,
          de: msg.from,
          nome: nomePorTelefone.get(msg.from) ?? null,
          tipo: msg.type ?? 'unknown',
          texto: textoDaMensagem(msg),
          opcaoId: opcaoDaMensagem(msg),
          /*
           * O timestamp vem em SEGUNDOS, como string. Passar direto para o
           * `Date` colocaria a mensagem em 1970 — e o cardápio responderia a
           * um pedido com 56 anos de atraso.
           */
          em: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
          paraNumeroId: numeroDaLoja,
        });
      }
    }
  }

  return saida;
}

/**
 * O identificador da opção tocada — o carimbo que nós mesmos colamos.
 *
 * `button.payload` é o equivalente nos botões de template, que têm outro
 * formato mas o mesmo papel.
 */
function opcaoDaMensagem(msg: {
  button?: { payload?: string };
  interactive?: { button_reply?: { id?: string }; list_reply?: { id?: string } };
}): string | null {
  const bruto =
    msg.interactive?.button_reply?.id ??
    msg.interactive?.list_reply?.id ??
    msg.button?.payload;

  return bruto?.trim() || null;
}

/**
 * O texto que o cliente quis dizer, seja lá por qual controle.
 *
 * Botão e lista não mandam `text`: mandam o rótulo do que foi tocado. Ler só
 * `text.body` faria toda resposta de menu chegar vazia — justamente o caminho
 * que o bot mais usa.
 */
function textoDaMensagem(msg: {
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  image?: { caption?: string };
}): string | null {
  const bruto =
    msg.text?.body ??
    msg.button?.text ??
    msg.interactive?.button_reply?.title ??
    msg.interactive?.list_reply?.title ??
    msg.image?.caption ??
    descricaoDaLocalizacao(msg.location);

  return bruto?.trim() || null;
}

/**
 * O pin como texto, para o motor e o log enxergarem.
 *
 * Sem isto a mensagem de localização chega com `texto: null` — foi o que
 * aconteceu na conversa real, e o agente improvisou em cima do vazio.
 */
function descricaoDaLocalizacao(
  loc?: { latitude?: number; longitude?: number; name?: string; address?: string },
): string | null {
  if (!loc || loc.latitude == null || loc.longitude == null) return null;
  const onde = [loc.name, loc.address].filter(Boolean).join(' — ');
  return onde
    ? `📍 ${onde} (${loc.latitude}, ${loc.longitude})`
    : `📍 Localização (${loc.latitude}, ${loc.longitude})`;
}

/**
 * Os recibos de envio dentro do envelope.
 *
 * Mesma inscrição das mensagens: `messages` entrega as duas coisas. Quem só lê
 * `messages[]` nunca descobre que a mensagem falhou — e falha silenciosa num
 * bot de atendimento é o cliente achando que foi ignorado.
 */
export function statusesDoEvento(corpo: unknown): StatusDeEnvio[] {
  const envelope = corpo as EnvelopeMeta;
  const saida: StatusDeEnvio[] = [];

  for (const entry of envelope?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const st of change.value?.statuses ?? []) {
        if (!st.id) continue;

        const erro = st.errors?.[0];
        saida.push({
          id: st.id,
          status: st.status ?? 'unknown',
          para: st.recipient_id ?? '',
          erro: erro
            ? { code: erro.code, titulo: erro.title, detalhe: erro.error_data?.details }
            : null,
          em: st.timestamp ? new Date(Number(st.timestamp) * 1000) : new Date(),
        });
      }
    }
  }

  return saida;
}
