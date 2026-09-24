import { Address } from '@/core';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { criarGeocoder } from './padrao';

/**
 * Onde fica este endereço, para conferir antes de enviar.
 *
 * O geocodificador falha por coisas fora do alcance de quem pede: rua nova, ou
 * uma letra de diferença. Quando falha, devolve `null` — quem chama decide o
 * que dizer. A tela do cardápio e o WhatsApp usam a mesma busca, para o pino
 * do chat não cair numa rua diferente da que o site mostraria.
 */
export async function localizarEnderecoDaLoja(
  slug: string,
  endereco: string,
): Promise<{ lat: number; lng: number } | null> {
  const prisma = getPrismaClient(env().DATABASE_URL);
  const establishment = await prisma.establishment.findUnique({
    where: { slug },
    select: { id: true, city: true, state: true },
  });
  if (!establishment) return null;

  try {
    const achado = await criarGeocoder(establishment.id)
      .geocode(Address.create(endereco), {
        city: establishment.city,
        state: establishment.state,
      })
      .catch(() => null);

    if (!achado) return null;
    return achado.toJSON();
  } catch {
    return null;
  }
}
