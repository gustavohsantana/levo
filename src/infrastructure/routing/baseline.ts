/**
 * Custo da rota na ordem em que os pedidos chegaram — o "antes" da comparação.
 *
 * É o que aconteceria sem o Girô: o dono imprime os pedidos na ordem em que
 * caíram e o motoboy sai seguindo o maço. A diferença entre isso e a rota
 * otimizada é o número que o piloto precisa provar, então é calculado com a
 * mesma matriz do otimizador — comparação justa, não estimativa.
 */
export function baselineDuration(
  matrix: number[][],
  options: { returnToOrigin?: boolean } = {},
): number {
  const returnToOrigin = options.returnToOrigin ?? true;
  const stops = matrix.length - 1;
  if (stops <= 0) return 0;

  let total = matrix[0][1];
  for (let i = 1; i < stops; i++) total += matrix[i][i + 1];
  if (returnToOrigin) total += matrix[stops][0];

  return total;
}
