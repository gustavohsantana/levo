import { NextResponse } from 'next/server';
import { createCourierSession } from '@/presentation/http/courier-session';
import { checkRateLimit, clearRateLimit } from '@/presentation/http/rate-limit';

/**
 * O login do motoboy, sem JavaScript nenhum no caminho.
 *
 * Era uma Server Action que, dando certo, mandava o navegador para a rota com
 * `location.assign`. Duas coisas quebraram nisso no WebView Chromium 87 do
 * tablet do piloto: o JavaScript do site inteiro não rodava (o runtime do Next
 * usa sintaxe de 2022), e a página pedir a própria navegação mata o processo
 * que desenha a tela.
 *
 * POST-redirect-GET resolve as duas de uma vez: quem navega é o navegador,
 * seguindo o 303, e o formulário funciona com o script morto. Numa tela que é a
 * porta do turno do motoboy, não depender de JavaScript não é purismo — é a
 * diferença entre ele começar a trabalhar e ligar para a loja.
 */

export const dynamic = 'force-dynamic';

const LOGIN_VALIDO = /^[a-z0-9._-]{3,}$/;

export async function POST(request: Request) {
  /*
   * O formulário é público e sem token de CSRF, então a origem é o que separa
   * um POST nosso de um POST de outro site. Ausente ela passa: nem todo cliente
   * envia o cabeçalho, e recusar por ausência trancaria motoboy de fora.
   */
  const origem = request.headers.get('origin');
  if (origem && new URL(origem).host !== new URL(request.url).host) {
    return NextResponse.json({ error: 'Origem inválida' }, { status: 403 });
  }

  const form = await request.formData();
  const login = String(form.get('login') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');

  if (!LOGIN_VALIDO.test(login) || password.length < 8) {
    return voltar(request, 'dados');
  }

  const chave = `courier-login:${login}`;
  const limite = checkRateLimit(chave, { max: 10, windowMs: 15 * 60_000 });
  if (!limite.allowed) return voltar(request, 'limite');

  try {
    await createCourierSession(login, password);
    clearRateLimit(chave);
  } catch {
    // Sem distinguir usuário inexistente de senha errada: a diferença só serve
    // a quem está adivinhando.
    return voltar(request, 'credenciais');
  }

  return NextResponse.redirect(new URL('/entregador', request.url), 303);
}

/**
 * Volta ao formulário com um código de erro — nunca com o que ele digitou.
 *
 * Só o código viaja na URL. Usuário e senha ficariam no histórico do navegador
 * e no log de acesso do servidor, e nenhum dos dois é lugar para credencial.
 */
function voltar(request: Request, erro: 'dados' | 'limite' | 'credenciais') {
  const destino = new URL('/entregador/login', request.url);
  destino.searchParams.set('erro', erro);

  return NextResponse.redirect(destino, 303);
}
