import { NextResponse } from 'next/server';
import { destroyCourierSession } from '@/presentation/http/courier-session';

/**
 * Sair sem Server Action e sem redirect do Next.
 *
 * No WebView do tablet a action de logout travava uns 10s e o app fechava.
 * Aqui a resposta é HTML 200: apaga o cookie e o próprio documento vai para
 * o login, no mesmo host.
 */
export async function GET() {
  await destroyCourierSession();

  return new NextResponse(
    `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=/entregador">
<title>Saindo · Levô</title>
<style>html,body{margin:0;background:#faf9f7;color:#1c1917;min-height:100%}</style>
</head>
<body>
<script>location.replace('/entregador')</script>
</body>
</html>`,
    {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}
