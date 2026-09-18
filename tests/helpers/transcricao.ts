import { avancar, type Retrato } from '@/infrastructure/integrations/whatsapp/conversa/motor';
import { estadoInicial, type EstadoDaConversa } from '@/infrastructure/integrations/whatsapp/conversa/estado';
import type { MensagemDeSaida } from '@/infrastructure/integrations/whatsapp/conversa/mensagem-de-saida';
import type { MensagemRecebida } from '@/infrastructure/integrations/whatsapp/webhook-protocol';

/**
 * Roda uma conversa e devolve o diálogo em texto.
 *
 * Existe porque texto e ordem das perguntas são onde um bot de pedido irrita ou
 * encanta — e isso não se avalia lendo código, só lendo a conversa. Com isto o
 * dono do produto lê o diálogo impresso e reclama ANTES de virar mensagem no
 * celular de um cliente.
 */

export interface Turno {
  /** O que o cliente digitou, ou o `id` da opção que ele tocou. */
  cliente: string;
  /** `true` quando `cliente` é o id de um toque, não texto. */
  toque?: boolean;
  /**
   * Tipo da mensagem no WhatsApp.
   *
   * Áudio, foto e pin não carregam `text.body`. Sem isto o teste não reproduz
   * o que o webhook entrega de verdade — e foi exatamente o buraco da conversa
   * real: localização com texto nulo, agente improvisando em cima do vazio.
   */
  tipo?: 'text' | 'audio' | 'image' | 'video' | 'sticker' | 'document' | 'location' | 'interactive';
}

export function conversar(
  turnos: Turno[],
  retrato: Retrato,
  inicial: EstadoDaConversa = estadoInicial(),
): { transcricao: string; estado: EstadoDaConversa; delegou: boolean } {
  let estado = inicial;
  const linhas: string[] = [];
  let delegou = false;

  for (const turno of turnos) {
    linhas.push(`👤 ${turno.toque ? `[toque: ${turno.cliente}]` : turno.cliente}`);

    const msg = mensagem(turno);
    const r = avancar(estado, msg, retrato);
    estado = r.estado;
    if (r.delegarAoAgente) delegou = true;

    if (r.delegarAoAgente) linhas.push('🤖 (delegado ao agente)');
    else if (r.respostas.length === 0) linhas.push('🤖 (silêncio)');
    for (const resposta of r.respostas) linhas.push(renderizar(resposta));
    linhas.push('');
  }

  return { transcricao: linhas.join('\n').trimEnd(), estado, delegou };
}

export function mensagem(turno: Turno): MensagemRecebida {
  const tipo = turno.tipo ?? (turno.toque ? 'interactive' : 'text');
  const semTexto =
    tipo === 'audio' ||
    tipo === 'image' ||
    tipo === 'video' ||
    tipo === 'sticker' ||
    tipo === 'document';
  return {
    id: `wamid.${Math.random().toString(36).slice(2, 10)}`,
    de: '553591398956',
    nome: 'Gustavo',
    tipo,
    texto: turno.toque || semTexto ? null : turno.cliente,
    opcaoId: turno.toque ? turno.cliente : null,
    em: new Date(),
    paraNumeroId: '1280375845161357',
  };
}

/** Desenha a mensagem como ela apareceria no celular. */
export function renderizar(m: MensagemDeSaida): string {
  if (m.tipo === 'imagem') {
    const cap = m.corpo ? m.corpo.split('\n').map((l) => `🤖 ${l}`).join('\n') : '';
    return cap ? `🤖 [foto]\n${cap}` : '🤖 [foto]';
  }

  const corpo = m.corpo.split('\n').map((l) => `🤖 ${l}`).join('\n');

  if (m.tipo === 'texto') return corpo;

  if (m.tipo === 'botoes') {
    return `${corpo}\n   ${m.opcoes.map((o) => `[ ${o.rotulo} ]`).join('  ')}`;
  }

  const linhas = m.opcoes
    .map((o) => `   │ ${o.rotulo}${o.descricao ? ` — ${o.descricao}` : ''}`)
    .join('\n');
  return `${corpo}\n   ┌─ ${m.rotuloDoBotao} ─\n${linhas}\n   └─`;
}
