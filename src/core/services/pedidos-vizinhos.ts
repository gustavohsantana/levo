/**
 * Pedidos na fila que vale a pena levar na mesma viagem.
 *
 * O caso que motivou: dois pedidos entram separados, o dono não repara que vão
 * para o mesmo prédio, e saem dois motoboys para o mesmo lugar — um chega, o
 * outro chega logo atrás. O cliente vê dois entregadores para a mesma porta, e a
 * loja pagou duas corridas.
 *
 * Isso não é falha do roteirizador: dentro de uma leva ele já põe destinos
 * próximos lado a lado. É falha de ninguém ter avisado, no momento de montar a
 * leva, que aqueles pedidos eram vizinhos.
 *
 * Aqui a regra **recomenda e nunca decide**. Mesmo endereço não significa mesma
 * entrega — prédio comercial com dez empresas, condomínio, república. E o dono
 * tem motivos que o sistema não vê: o cliente que já ligou cobrando, o pedido
 * que sai frio, o motoboy que mora para aquele lado. Agrupar sozinho criaria um
 * erro pior, porque silencioso.
 */

export interface PedidoParaAgrupar {
  id: string;
  coordinates: { lat: number; lng: number } | null;
}

export interface GrupoDeVizinhos {
  ids: string[];
  /** A maior distância entre dois pedidos do grupo, em metros. */
  espalhamento: number;
}

/**
 * Até onde dois pedidos ainda são "o mesmo lado".
 *
 * Mil metros é o raio de um bairro pequeno, e o desvio que ele custa a um
 * motoboy é de dois a três minutos — muito menos que a viagem inteira que se
 * economiza. Acima disso a sugestão começa a juntar coisa que só parece perto no
 * mapa, e uma sugestão ruim ensina o dono a ignorar todas.
 */
const RAIO_PADRAO_METROS = 1000;

const RAIO_DA_TERRA_METROS = 6_371_000;

/** Distância em linha reta, que para uma sugestão é precisão de sobra. */
export function distanciaEmMetros(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * RAIO_DA_TERRA_METROS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Os grupos de pedidos vizinhos que estão esperando agora.
 *
 * Encadeia por vizinhança: se A é perto de B e B é perto de C, os três viram um
 * grupo mesmo que A e C estejam mais longe entre si. É proposital — três
 * entregas ao longo da mesma avenida são uma viagem só, e não três. Por isso o
 * grupo também informa o espalhamento: é ele que deixa o dono julgar se o
 * corredor ficou comprido demais.
 *
 * Pedido sem coordenada fica de fora, e é o comportamento certo: sem saber onde
 * ele é, sugerir que é vizinho de alguém seria inventar.
 */
export function pedidosVizinhos(
  pedidos: PedidoParaAgrupar[],
  opcoes: { raioMetros?: number; maximoPorGrupo?: number } = {},
): GrupoDeVizinhos[] {
  const raio = opcoes.raioMetros ?? RAIO_PADRAO_METROS;
  const teto = opcoes.maximoPorGrupo ?? Number.POSITIVE_INFINITY;

  const comLugar = pedidos.filter(
    (p): p is PedidoParaAgrupar & { coordinates: { lat: number; lng: number } } =>
      p.coordinates !== null,
  );

  const visitados = new Set<string>();
  const grupos: GrupoDeVizinhos[] = [];

  for (const semente of comLugar) {
    if (visitados.has(semente.id)) continue;

    // Alastra a partir da semente enquanto houver vizinho de algum já incluído.
    const grupo = [semente];
    visitados.add(semente.id);

    for (let i = 0; i < grupo.length; i++) {
      for (const candidato of comLugar) {
        if (visitados.has(candidato.id)) continue;
        if (grupo.length >= teto) break;
        if (distanciaEmMetros(grupo[i].coordinates, candidato.coordinates) > raio) continue;

        grupo.push(candidato);
        visitados.add(candidato.id);
      }
    }

    // Pedido sozinho não é oportunidade: é só um pedido.
    if (grupo.length < 2) continue;

    let espalhamento = 0;
    for (let i = 0; i < grupo.length; i++) {
      for (let j = i + 1; j < grupo.length; j++) {
        const d = distanciaEmMetros(grupo[i].coordinates, grupo[j].coordinates);
        if (d > espalhamento) espalhamento = d;
      }
    }

    grupos.push({ ids: grupo.map((p) => p.id), espalhamento: Math.round(espalhamento) });
  }

  /*
   * Maior primeiro: o grupo de quatro economiza mais viagem que o de dois, e é o
   * que merece o olho do dono na noite cheia — que é justamente quando ele não
   * tem tempo de olhar.
   */
  return grupos.sort((a, b) => b.ids.length - a.ids.length);
}

/** "a 400 m um do outro" — o que faz o dono confiar ou não na sugestão. */
export function textoDoEspalhamento(metros: number): string {
  if (metros < 100) return 'praticamente no mesmo ponto';
  if (metros < 1000) return `a ${Math.round(metros / 50) * 50} m um do outro`;
  return `a ${(metros / 1000).toFixed(1).replace('.', ',')} km um do outro`;
}
