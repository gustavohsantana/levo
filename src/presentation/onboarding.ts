'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { Address, ValidationError } from '@/core';
import { cadastroSchema } from '@/application/dto/schemas';
import { slugDisponivel } from '@/core/services/slug-da-loja';
import { NominatimGeocoder } from '@/infrastructure/geocoding/nominatim-geocoder';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { env } from '@/env';
import { createSession, hashPassword } from './http/session';
import { checkRateLimit } from './http/rate-limit';
import { toFormError } from './http/error-mapper';

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * O cadastro de uma loja nova — a porta de entrada de todo cliente que vier.
 *
 * Roda fora de qualquer estabelecimento, por definição: é ele que cria o
 * estabelecimento. Por isso não passa pelo `UnitOfWork`, cujos repositórios
 * nascem com um `establishmentId` que aqui ainda não existe.
 */
export async function cadastrarAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = cadastroSchema.safeParse({
    nomeDaLoja: formData.get('nomeDaLoja'),
    endereco: formData.get('endereco'),
    cidade: formData.get('cidade'),
    estado: formData.get('estado'),
    nome: formData.get('nome'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const dados = parsed.data;

  /*
   * Cadastro é alvo de robô como qualquer formulário público, e cada tentativa
   * aqui custa uma chamada ao geocodificador — que é serviço de terceiro com
   * cota. Limitar pelo e-mail, e não pelo IP: é o e-mail que identifica a conta
   * que alguém está tentando criar em massa.
   */
  const chave = `cadastro:${dados.email}`;
  const limite = checkRateLimit(chave, { max: 5, windowMs: 60 * 60_000 });
  if (!limite.allowed) {
    return { ok: false, error: 'Muitas tentativas. Tente de novo daqui a pouco.' };
  }

  const prisma = getPrismaClient(env().DATABASE_URL);

  try {
    const jaExiste = await prisma.user.findUnique({
      where: { email: dados.email },
      select: { id: true },
    });
    if (jaExiste) {
      return {
        ok: false,
        error: 'Já existe uma conta com esse e-mail. Tente entrar, ou use outro.',
      };
    }

    /*
     * O endereço vira coordenada aqui, e o cadastro para se não virar.
     *
     * A loja é a origem de toda rota: com ela no lugar errado, todo cálculo de
     * distância, taxa e tempo sai errado — e sai errado em silêncio, porque o
     * mapa mostra uma rota plausível saindo do lugar errado. Melhor recusar
     * agora, com o dono na tela e podendo corrigir, do que descobrir na primeira
     * entrega.
     *
     * Sem cache de propósito: o cache vive por estabelecimento, e aqui ainda não
     * há um.
     */
    const config = env();
    const geocoder = new NominatimGeocoder({
      baseUrl: config.GEOCODER_BASE_URL,
      apiKey: config.GEOCODER_API_KEY || undefined,
      userAgent: config.GEOCODER_USER_AGENT,
    });

    const coordenadas = await geocoder.geocode(Address.create(dados.endereco), {
      city: dados.cidade,
      state: dados.estado,
    });

    if (!coordenadas) {
      return {
        ok: false,
        error:
          'Não encontramos esse endereço no mapa. Confira o número e o bairro — ' +
          'é dele que sai o cálculo de todas as suas rotas.',
      };
    }

    const slug = await slugDisponivel(dados.nomeDaLoja, async (candidato) => {
      const existe = await prisma.establishment.findUnique({
        where: { slug: candidato },
        select: { id: true },
      });
      return existe !== null;
    });

    /*
     * Loja e dono na mesma transação.
     *
     * Uma loja sem usuário é uma loja que ninguém consegue abrir, e ela ficaria
     * ocupando o slug para sempre. Ou nascem os dois, ou não nasce nada.
     */
    await prisma.$transaction(async (tx) => {
      const loja = await tx.establishment.create({
        data: {
          name: dados.nomeDaLoja,
          address: dados.endereco,
          city: dados.cidade,
          state: dados.estado,
          slug,
          lat: coordenadas.lat,
          lng: coordenadas.lng,
        },
      });

      await tx.user.create({
        data: {
          establishmentId: loja.id,
          email: dados.email,
          name: dados.nome,
          passwordHash: hashPassword(dados.password),
        },
      });
    });

    await createSession(dados.email, dados.password);
  } catch (cause) {
    if (cause instanceof ValidationError) return { ok: false, error: cause.message };
    return { ok: false, error: toFormError(cause) };
  }

  // Fora do try: `redirect` funciona lançando, e o catch o engoliria.
  redirect('/dashboard');
}
