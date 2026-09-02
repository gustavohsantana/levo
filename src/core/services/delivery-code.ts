import { ValidationError } from '../errors';

/**
 * O código que o cliente dita ao entregador para fechar a entrega.
 *
 * Não é segurança: quatro dígitos não protegem nada contra quem quer fraudar de
 * verdade. É **prova de presença** — sem ele, "entregue" é a palavra de uma
 * pessoa só, e a divergência aparece dias depois, pelo cliente reclamando de um
 * pedido que consta entregue.
 *
 * Quatro dígitos porque é ditado na porta, às vezes com a moto ligada e o
 * capacete fechado. Seis já faz o cliente repetir.
 */
export function gerarCodigoDeEntrega(sortear: () => number = Math.random): string {
  return String(Math.floor(sortear() * 10_000)).padStart(4, '0');
}

/**
 * Confere o código informado pelo entregador.
 *
 * Compara só dígitos: o cliente lê "12 34" e o motoboy digita "1234", e recusar
 * por causa de um espaço seria transformar um acerto em erro.
 */
export function conferirCodigoDeEntrega(esperado: string | null, informado: string | null): void {
  /*
   * Pedido sem código gerado não pode ser bloqueado.
   *
   * Pedidos criados antes deste recurso existirem não têm código, e travar a
   * entrega deles deixaria o motoboy parado no portão sem saída nenhuma.
   */
  if (!esperado) return;

  const limpo = (informado ?? '').replace(/\D/g, '');
  if (limpo.length === 0) {
    throw new ValidationError('Peça ao cliente o código de confirmação da entrega.');
  }

  if (limpo !== esperado.replace(/\D/g, '')) {
    throw new ValidationError('Código incorreto. Confira com o cliente.');
  }
}
