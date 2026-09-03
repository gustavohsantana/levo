import 'dotenv/config';
import { afterAll, describe, expect, it } from 'vitest';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { slugDisponivel } from '@/core/services/slug-da-loja';

/**
 * O cadastro visto pelo banco.
 *
 * A parte pura do slug já tem teste em memória; o que só o Postgres prova é a
 * unicidade — `Establishment.slug` é `@unique`, e é ela que impede a segunda
 * Pizzaria do Zé de roubar o endereço público da primeira.
 */
const prisma = getPrismaClient(process.env.DATABASE_URL!);
const criadas: string[] = [];

async function criarLoja(nome: string) {
  const slug = await slugDisponivel(nome, async (candidato) => {
    const existe = await prisma.establishment.findUnique({
      where: { slug: candidato },
      select: { id: true },
    });
    return existe !== null;
  });

  const loja = await prisma.establishment.create({
    data: { name: nome, address: 'Rua de Teste, 1', city: 'Pouso Alegre', state: 'MG', slug, lat: -22.2, lng: -45.9 },
  });
  criadas.push(loja.id);
  return loja;
}

afterAll(async () => {
  await prisma.establishment.deleteMany({ where: { id: { in: criadas } } });
});

describe('duas lojas com o mesmo nome', () => {
  it('a segunda ganha endereço próprio, e a primeira não muda', async () => {
    const nome = `Pizzaria Teste ${Date.now()}`;

    const primeira = await criarLoja(nome);
    const segunda = await criarLoja(nome);

    expect(segunda.slug).toBe(`${primeira.slug}-2`);

    /*
     * Que a primeira não mude é metade do valor do teste: o slug é o link que o
     * dono já mandou no WhatsApp e imprimiu no cartão. Mudá-lo por causa de um
     * cadastro alheio quebraria o pedido de um cliente que nunca ouviu falar da
     * outra loja.
     */
    const conferida = await prisma.establishment.findUnique({ where: { id: primeira.id } });
    expect(conferida?.slug).toBe(primeira.slug);
  });

  it('o banco recusa slug repetido mesmo se o código deixar passar', async () => {
    // A trava final é a constraint, não a nossa lógica.
    const loja = await criarLoja(`Bar Teste ${Date.now()}`);

    await expect(
      prisma.establishment.create({
        data: { name: 'Clone', address: 'Rua X, 1', slug: loja.slug, lat: -22.2, lng: -45.9 },
      }),
    ).rejects.toThrow();
  });
});
