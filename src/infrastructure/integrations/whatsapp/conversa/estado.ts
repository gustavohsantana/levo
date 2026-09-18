import type { FalaDoDialogo } from '@/infrastructure/agente/porta-llm';

/**
 * O estado de uma conversa com um cliente.
 *
 * Vive em `WhatsappConversation.estado`, como JSON. Duas decisões importantes:
 *
 * 1. **O carrinho não é um pedido.** Rascunho gravado em `Order` apareceria no
 *    painel e na cozinha como pedido de verdade, e o dono cancelaria na mão
 *    algo que o cliente nem terminou de montar. Vira pedido só na confirmação.
 *
 * 2. **`lojaEmFoco` é separado dos pedidos.** O cliente pode ter pedido ativo
 *    em duas lojas e estar montando carrinho numa terceira. Aviso de status de
 *    uma NUNCA muda o foco da outra — se mudasse, o próximo "sim" dele iria
 *    para a loja errada.
 */

/** Onde a conversa está. Cada passo sabe o que fazer com a próxima mensagem. */
export type Passo =
  /** Nada ainda, ou tudo concluído. A próxima mensagem abre o atendimento. */
  | 'ocioso'
  /** Perguntou de qual loja é o pedido e espera o toque. */
  | 'escolhendo_loja'
  /** Loja definida, cliente decidindo o que quer. */
  | 'no_cardapio'
  /** Montando um item (complementos, quantidade). */
  | 'montando_item'
  /** Carrinho fechado, definindo entrega ou retirada. */
  | 'entrega_ou_retirada'
  /** Coletando endereço. */
  | 'endereco'
  /** Escolhendo forma de pagamento. */
  | 'pagamento'
  /** Aguardando confirmação final do resumo. */
  | 'confirmando'
  /**
   * Entregue a um humano.
   *
   * Enquanto está aqui o bot fica CALADO. Bot que continua respondendo por cima
   * do atendente é pior que bot nenhum — o cliente recebe duas vozes e não sabe
   * com quem fala.
   */
  | 'com_atendente';

/** Uma linha do carrinho, antes de virar item de pedido. */
export interface ItemNoCarrinho {
  productId: string;
  nome: string;
  quantidade: number;
  /** Preço unitário em centavos, complementos incluídos. */
  precoUnitarioCents: number;
  /** Complementos escolhidos, como o cliente os verá na comanda. */
  opcoes: string[];
}

export interface EstadoDaConversa {
  passo: Passo;
  /**
   * O diálogo com o modelo, para ele lembrar do que já foi dito.
   *
   * Vive junto do estado porque tem o mesmo dono e o mesmo tempo de vida — e
   * uma tabela só para isso seria uma junção a mais em todo turno. Já entra
   * podado pelo orquestrador; guardar a conversa inteira faria o JSON crescer
   * sem teto.
   */
  dialogo?: FalaDoDialogo[];
  /**
   * A loja com quem o cliente está falando AGORA. `null` quando ainda não se
   * sabe — e é isso que dispara a escada de resolução.
   */
  lojaEmFoco: string | null;
  carrinho: ItemNoCarrinho[];
  /**
   * Entrega ou retirada, quando o cliente já disse.
   *
   * Medido em produção: o cliente escreveu "entrega", passou rua, número,
   * bairro e CEP, e o bot perguntou "entrega ou retirada?". Guardar aqui é o
   * que sobrevive à poda do diálogo — o modelo esquece; o estado não.
   */
  entrega?: 'entrega' | 'retirada';
  /**
   * Endereço já montado (rua, número, bairro, cidade).
   *
   * Mesma razão do campo acima: numa conversa longa o diálogo é podado e o
   * bot pede o número de novo. O que já foi confirmado mora aqui.
   */
  endereco?: string;
  /**
   * Item que o cliente está montando agora (tamanho, base, adicionais).
   *
   * Fora do carrinho de propósito: só entra lá quando o grupo obrigatório
   * fechou. Um açaí sem tamanho não pode aparecer como pedido pela metade.
   */
  itemEmMontagem?: ItemEmMontagem;
  /** pix, dinheiro ou cartao — quando o cliente já escolheu. */
  pagamento?: string;
  /** ISO. Governa a expiração do carrinho. */
  atualizadoEm: string;
}

/** O rascunho de um item, grupo a grupo. */
export interface ItemEmMontagem {
  productId: string;
  /** Índice do grupo que está sendo perguntado. */
  grupoIndex: number;
  /** Ids de opção escolhidos, por id de grupo. */
  selecao: Record<string, string[]>;
}

/**
 * Por quanto tempo um carrinho pela metade continua valendo.
 *
 * Duas horas é generoso: a pessoa é interrompida, volta depois do banho, quer
 * continuar de onde parou. Passado isso, retomar um carrinho esquecido é pior
 * que começar limpo — o preço pode ter mudado e o item pode ter acabado.
 */
export const VALIDADE_DO_CARRINHO_MS = 2 * 60 * 60 * 1000;

export function estadoInicial(): EstadoDaConversa {
  return { passo: 'ocioso', lojaEmFoco: null, carrinho: [], atualizadoEm: new Date().toISOString() };
}

/**
 * Lê o JSON do banco com desconfiança.
 *
 * O formato muda entre deploys, e uma conversa gravada ontem pode ter um passo
 * que não existe mais. Cair para o estado inicial é sempre seguro: o cliente
 * recomeça, que é chato — mas melhor que o bot travar numa conversa que ele não
 * consegue mais interpretar.
 */
export function lerEstado(bruto: unknown): EstadoDaConversa {
  if (!bruto || typeof bruto !== 'object') return estadoInicial();

  const e = bruto as Partial<EstadoDaConversa>;
  if (!e.passo || !PASSOS.has(e.passo)) return estadoInicial();

  const carrinho = Array.isArray(e.carrinho) ? e.carrinho : [];
  const atualizadoEm = typeof e.atualizadoEm === 'string' ? e.atualizadoEm : new Date().toISOString();

  return {
    passo: e.passo,
    lojaEmFoco: typeof e.lojaEmFoco === 'string' ? e.lojaEmFoco : null,
    carrinho,
    atualizadoEm,
    ...(e.entrega === 'entrega' || e.entrega === 'retirada' ? { entrega: e.entrega } : {}),
    ...(typeof e.endereco === 'string' && e.endereco.trim() ? { endereco: e.endereco } : {}),
    ...(e.itemEmMontagem && typeof e.itemEmMontagem === 'object'
      ? { itemEmMontagem: e.itemEmMontagem as ItemEmMontagem }
      : {}),
    ...(typeof e.pagamento === 'string' && e.pagamento ? { pagamento: e.pagamento } : {}),
    ...(Array.isArray(e.dialogo) ? { dialogo: e.dialogo } : {}),
  };
}

const PASSOS = new Set<Passo>([
  'ocioso',
  'escolhendo_loja',
  'no_cardapio',
  'montando_item',
  'entrega_ou_retirada',
  'endereco',
  'pagamento',
  'confirmando',
  'com_atendente',
]);

/** O carrinho venceu? Carrinho vencido é descartado, não retomado. */
export function carrinhoExpirou(estado: EstadoDaConversa, agora: Date): boolean {
  if (estado.carrinho.length === 0) return false;
  return agora.getTime() - new Date(estado.atualizadoEm).getTime() > VALIDADE_DO_CARRINHO_MS;
}

export function totalDoCarrinho(carrinho: ItemNoCarrinho[]): number {
  return carrinho.reduce((t, i) => t + i.precoUnitarioCents * i.quantidade, 0);
}
