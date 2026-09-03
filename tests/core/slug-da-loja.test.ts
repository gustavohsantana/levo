import { describe, expect, it } from 'vitest';
import { slugDisponivel, slugDoNome } from '@/core/services/slug-da-loja';

/**
 * O endereço público da loja.
 *
 * É o que o dono manda no WhatsApp e imprime no cartão. Sai uma vez e não muda —
 * slug que muda quebra todo link já compartilhado, e quem descobre é o cliente
 * que não conseguiu pedir.
 */
const nunca = async () => false;
const sempre = async () => true;

describe('o nome vira endereço', () => {
  it('tira acento, cedilha e maiúscula', () => {
    expect(slugDoNome('Pizzaria do Zé')).toBe('pizzaria-do-ze');
    expect(slugDoNome('Açaí & Cia')).toBe('acai-e-cia');
    expect(slugDoNome('SEU JOÃO LANCHES')).toBe('seu-joao-lanches');
  });

  it('o "&" vira "e", e não some', () => {
    // "bar-lanches" perderia a conjunção e leria como outro nome.
    expect(slugDoNome('Bar & Lanches')).toBe('bar-e-lanches');
  });

  it('não deixa hífen sobrando nas pontas', () => {
    expect(slugDoNome('  ...Pizzaria!!!  ')).toBe('pizzaria');
    expect(slugDoNome('Pizza -- Boa')).toBe('pizza-boa');
  });

  it('corta nome quilométrico sem deixar hífen solto', () => {
    const s = slugDoNome('Restaurante e Pizzaria do Seu Zé Comidas Caseiras Ltda ME');

    expect(s.length).toBeLessThanOrEqual(40);
    expect(s.endsWith('-')).toBe(false);
  });
});

describe('quando o nome já está tomado', () => {
  it('usa o nome limpo se estiver livre', async () => {
    expect(await slugDisponivel('Pizzaria do Zé', nunca)).toBe('pizzaria-do-ze');
  });

  it('numera a partir do 2, que é como se lê em voz alta', async () => {
    // "a segunda Pizzaria do Zé" — e não um sufixo aleatório que ninguém dita
    // no telefone.
    const tomados = new Set(['pizzaria-do-ze']);
    const s = await slugDisponivel('Pizzaria do Zé', async (c) => tomados.has(c));

    expect(s).toBe('pizzaria-do-ze-2');
  });

  it('pula nome que colide com rota do site', async () => {
    // Uma loja chamada "Login" não pode virar /cardapio/login.
    expect(await slugDisponivel('Login', nunca)).toBe('login-2');
  });

  it('nome que não vira slug nenhum ainda produz endereço válido', async () => {
    // Só emoji, ou um alfabeto que o normalizador não converte.
    const s = await slugDisponivel('🍕🍕', nunca);

    expect(s).toBe('loja');
  });

  it('cem colisões não travam o cadastro', async () => {
    const s = await slugDisponivel('Pizzaria', sempre);

    expect(s).toMatch(/^pizzaria-[a-z0-9]+$/);
    expect(s).not.toBe('pizzaria');
  });
});
