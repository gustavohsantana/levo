/**
 * O que falta a loja nova fazer antes de conseguir despachar a primeira rota.
 *
 * Existe porque o painel de quem acabou de se cadastrar é honesto demais: ele
 * mostra "nenhum pedido esperando" e um botão para lançar o primeiro pedido —
 * que abre um formulário sem nenhum produto para escolher. A pessoa conclui que
 * o sistema está quebrado, e não que ela ainda não configurou nada.
 *
 * A ordem aqui não é arbitrária: é a ordem em que um passo destrava o seguinte.
 * Sem produto não dá para lançar pedido; sem pedido não há o que despachar; sem
 * motoboy não há para quem despachar.
 */
export interface Passo {
  id: 'produto' | 'taxa' | 'motoboy' | 'pedido';
  titulo: string;
  /** Por que o passo existe, na linguagem de quem vende comida. */
  porque: string;
  href: string;
  rotulo: string;
  feito: boolean;
}

export interface EstadoDaLoja {
  produtos: number;
  motoboys: number;
  taxaConfigurada: boolean;
  pedidos: number;
}

export function primeirosPassos(loja: EstadoDaLoja): Passo[] {
  return [
    {
      id: 'produto',
      titulo: 'Cadastre o que você vende',
      porque: 'Sem isso, montar um pedido significa digitar preço na mão toda vez.',
      href: '/dashboard/catalogo',
      rotulo: 'Abrir o catálogo',
      feito: loja.produtos > 0,
    },
    {
      id: 'taxa',
      titulo: 'Defina a taxa de entrega',
      porque: 'É o que entra no total do pedido e no acerto com o motoboy.',
      href: '/dashboard/configuracoes',
      rotulo: 'Definir a taxa',
      feito: loja.taxaConfigurada,
    },
    {
      id: 'motoboy',
      titulo: 'Cadastre um entregador',
      porque: 'A rota é montada para alguém — sem entregador não há para quem despachar.',
      href: '/dashboard/entregadores',
      rotulo: 'Cadastrar entregador',
      feito: loja.motoboys > 0,
    },
    {
      id: 'pedido',
      titulo: 'Lance o primeiro pedido',
      porque: 'Pode ser um de teste. Serve para ver a rota sendo montada de verdade.',
      href: '/dashboard',
      rotulo: 'Ir para os pedidos',
      feito: loja.pedidos > 0,
    },
  ];
}

/**
 * O roteiro some sozinho quando a loja está de pé.
 *
 * Lista de tarefas que fica para sempre vira decoração — e pior, vira decoração
 * que ocupa a dobra da tela mais usada do produto. Quando os passos que
 * destravam o uso estão feitos, ela sai de cena e não volta.
 *
 * O primeiro pedido não conta para sumir: ele é convite, não pré-requisito. Uma
 * loja com cardápio, taxa e entregador já está pronta para o pedido que vier do
 * cliente, sem precisar inventar um de teste.
 */
export function deveMostrarRoteiro(loja: EstadoDaLoja): boolean {
  return !(loja.produtos > 0 && loja.taxaConfigurada && loja.motoboys > 0);
}
