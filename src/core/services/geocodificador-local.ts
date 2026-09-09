/**
 * O geocodificador que a loja constrói da própria cidade.
 *
 * A base do OpenStreetMap não tem as ruas do interior — a "Rua Antônio de Souza
 * Gouveia" do Bruno não existe nela, e sem coordenada não há rota. O IBGE, no
 * censo, tem: cada endereço do país com rua, número, bairro e coordenada,
 * público e de graça. Este módulo é a parte pura que transforma esse cadastro
 * numa resposta — normalizar a chave de busca e achar o ponto do número pedido.
 *
 * A lição que os dados ensinaram: o bairro NÃO é detalhe. Pouso Alegre tem duas
 * "Rua Antônio de Souza Gouveia" — uma no Joaquim José Franco, outra no Jardim
 * Olímpico, a 3 km. Sem o bairro, o pino pode cair do outro lado da cidade. Por
 * isso a chave inclui o bairro, e a desambiguação é explícita.
 */

/** Normaliza rua ou bairro para virar chave: sem acento, sem tipo, sem ruído. */
export function chaveDeLogradouro(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // O tipo do logradouro entra e sai à toa: "Rua", "R.", "Avenida", "Av".
    // Tirá-lo dos dois lados garante que a mesma rua case escrita de qualquer jeito.
    .replace(/\b(r|rua|av|avenida|trav|travessa|al|alameda|pca|praca|rod|rodovia|estr|estrada)\b\.?/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Um endereço conhecido da cidade: um número numa rua, com sua coordenada. */
export interface PontoConhecido {
  numero: number;
  lat: number;
  lng: number;
}

export interface Coordenada {
  lat: number;
  lng: number;
}

/**
 * O ponto do número pedido, a partir dos números conhecidos da mesma rua.
 *
 * O censo amostra endereços — tem o 32 e o 39, raramente o 37 exato. Então:
 *
 * - Número exato conhecido → é ele.
 * - Entre dois conhecidos → interpola na proporção. O 37 entre o 32 e o 39 fica
 *   a cinco sétimos do caminho, e numa rua residencial isso é a porta certa.
 * - Fora da faixa (número maior que todos, ou sem número) → o extremo mais
 *   próximo. Melhor a ponta da rua certa que uma rua errada.
 *
 * Recebe SÓ os pontos de uma rua num bairro — a desambiguação de bairro é de
 * quem chama, porque é lá que estão os dados para decidir.
 */
export function coordenadaDoNumero(
  numero: number,
  conhecidos: PontoConhecido[],
): Coordenada | null {
  const validos = conhecidos.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (validos.length === 0) return null;

  // Sem número (0), ou rua com um ponto só: o único ponto que há é a resposta.
  const comNumero = validos.filter((p) => p.numero > 0).sort((a, b) => a.numero - b.numero);
  if (numero <= 0 || comNumero.length === 0) {
    const centro = validos[Math.floor(validos.length / 2)];
    return { lat: centro.lat, lng: centro.lng };
  }

  const exato = comNumero.find((p) => p.numero === numero);
  if (exato) return { lat: exato.lat, lng: exato.lng };

  // Antes do primeiro / depois do último: o extremo.
  if (numero < comNumero[0].numero) {
    return { lat: comNumero[0].lat, lng: comNumero[0].lng };
  }
  const ultimo = comNumero[comNumero.length - 1];
  if (numero > ultimo.numero) {
    return { lat: ultimo.lat, lng: ultimo.lng };
  }

  // Entre dois conhecidos: interpola.
  for (let i = 0; i < comNumero.length - 1; i++) {
    const a = comNumero[i];
    const b = comNumero[i + 1];
    if (numero >= a.numero && numero <= b.numero) {
      const t = (numero - a.numero) / (b.numero - a.numero);
      return {
        lat: a.lat + t * (b.lat - a.lat),
        lng: a.lng + t * (b.lng - a.lng),
      };
    }
  }

  // Inalcançável em teoria; um fallback honesto é melhor que um throw.
  return { lat: comNumero[0].lat, lng: comNumero[0].lng };
}
