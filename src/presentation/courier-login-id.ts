/**
 * O usuario do app, a partir do nome.
 *
 * Motoboy nao usa e-mail. O dono gera um login curto — o primeiro nome, sem
 * acento — e uma senha. Se "jefferson" ja existir, quem gera acrescenta um
 * numero; esta funcao so devolve a base.
 */
export function loginFromName(name: string): string {
  const primeiro = name.trim().split(/\s+/)[0] ?? '';
  const slug = asciiMinusculo(primeiro);
  if (slug.length >= 3) return slug.slice(0, 20);

  const inteiro = asciiMinusculo(name);
  return (inteiro.slice(0, 20) || 'moto');
}

export function gerarSenhaDoApp(): string {
  const alfabeto = '23456789abcdefghjkmnpqrstuvwxyz';
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

function asciiMinusculo(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
