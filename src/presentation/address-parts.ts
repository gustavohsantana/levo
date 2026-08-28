/**
 * Junta as partes do endereço do cardápio num texto que o geocodificador e o
 * motoboy entendem.
 *
 * Campo único ("rua, número, bairro") é o que o cliente erra: bairro vai no
 * complemento, número some, cidade fica de fora. Partes separadas montam sempre
 * o mesmo formato — e o Nominatim já sabe cair o bairro se o OSM não o tiver.
 */
export function montarEndereco(parts: {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
}): string {
  const rua = parts.rua.trim().replace(/\s+/g, ' ');
  const numero = parts.numero.trim().replace(/\s+/g, ' ');
  const bairro = parts.bairro.trim().replace(/\s+/g, ' ');
  const cidade = parts.cidade.trim().replace(/\s+/g, ' ');

  const via = [rua, numero].filter(Boolean).join(', ');
  const local = [bairro, cidade].filter(Boolean).join(', ');

  return [via, local].filter(Boolean).join(' - ');
}
