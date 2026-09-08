import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCourierSession } from '@/presentation/http/courier-session';
import { CourierLoginScreen, type ErroDeLogin } from '@/presentation/ui/patterns/courier-login-screen';

export const metadata: Metadata = { title: 'Entrar · Levô' };
export const dynamic = 'force-dynamic';

const ERROS = ['dados', 'limite', 'credenciais'] as const;

export default async function EntregadorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  // O try fica só em volta da leitura: `redirect` funciona lançando, e dentro
  // do try ele seria engolido pelo catch como se fosse sessão ilegível.
  let jaEntrou = false;
  try {
    jaEntrou = Boolean(await getCourierSession());
  } catch {
    // Sessão ilegível é sessão que não existe: cai no formulário.
  }

  /*
   * Redirecionamento da rede, e não uma tela que se substitui.
   *
   * Aqui havia um `<meta refresh>` para `/entregador`. Funciona em qualquer
   * navegador moderno, e mata o processo que desenha a página no WebView
   * Chromium 87 do tablet do piloto — a página pedir a própria navegação é o
   * que derruba, e o app entrava em laço: login, rota, queda, login.
   *
   * Com o 307, quem navega é o carregamento que o app já iniciou.
   */
  if (jaEntrou) redirect('/entregador');

  const { erro } = await searchParams;

  return (
    <CourierLoginScreen
      erro={(ERROS as readonly string[]).includes(erro ?? '') ? (erro as ErroDeLogin) : undefined}
    />
  );
}
