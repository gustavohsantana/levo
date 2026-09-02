/**
 * Duas grafias da mesma rua?
 *
 * "R. Ernani Rezende Vilela" e "Rua Ernani Rezende Vilela" são o mesmo lugar, e
 * perguntar ao cliente se ele quer trocar uma pela outra seria ruído. Só a
 * diferença de verdade merece a pergunta.
 */
export function mesmaRua(a: string, b: string): boolean {
  const limpar = (x: string) =>
    x
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(r|rua|av|avenida|trav|travessa|al|alameda|pca|praca)\b\.?/g, '')
      .replace(/[^a-z0-9]/g, '');

  return limpar(a) === limpar(b);
}
