import type { Metadata } from 'next';
import { env } from '@/env';
import { CredentialStore } from '@/infrastructure/integrations/credential-store';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { requireSession } from '@/presentation/http/session';
import { IfoodConnect } from '@/presentation/ui/patterns/ifood-connect';

export const metadata: Metadata = { title: 'Integrações · Levô' };
export const dynamic = 'force-dynamic';

/**
 * Onde o dono conecta as plataformas de pedido.
 *
 * Antes disso, vincular uma loja exigia rodar um script pelo terminal — o que
 * na prática significava que só quem escreveu o sistema conseguia colocar um
 * cliente para funcionar.
 */
export default async function IntegracoesPage() {
  const session = await requireSession();
  const prisma = getPrismaClient(env().DATABASE_URL);
  const store = new CredentialStore(prisma, env().AUTH_SECRET);

  /*
   * Credencial ilegível não pode derrubar a tela.
   *
   * Os tokens são cifrados com o AUTH_SECRET, e se ele mudar entre ambientes —
   * ou for rotacionado — o decifrar falha. Isso é recuperável: basta reconectar.
   * Estourar aqui deixaria o dono com uma página quebrada e nenhuma pista do
   * que fazer, quando a saída é um clique.
   */
  const ifood = await store.read(session.establishmentId, 'IFOOD').catch((cause) => {
    // Engolir em silêncio esconde a causa justamente quando ela importa: sem
    // isto, uma credencial ilegível é indistinguível de nunca ter conectado.
    console.error('[integracoes] credencial ilegível', {
      establishmentId: session.establishmentId,
      cause: String(cause),
    });
    return null;
  });
  const nomeDaLoja = ifood?.merchantId ? await buscarNome(ifood) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Integrações</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Conecte as plataformas onde você recebe pedidos. Eles entram aqui sem digitação.
        </p>
      </div>

      <IfoodConnect
        conectado={Boolean(ifood)}
        lojaAtual={ifood?.merchantId ? { id: ifood.merchantId, nome: nomeDaLoja } : null}
      />

      <div className="rounded-lg bg-raised p-5 hairline">
        <h3 className="font-semibold text-ink-muted">aiqfome</h3>
        <p className="mt-1 text-sm text-ink-faint">
          Em processo de homologação. Assim que sair, aparece aqui do mesmo jeito.
        </p>
      </div>
    </div>
  );
}

/**
 * O nome da loja não fica guardado, só o id. Buscar aqui evita mais uma coluna
 * para manter em sincronia — e se a chamada falhar, a tela mostra o id, que já
 * diz ao dono que existe uma loja conectada.
 */
async function buscarNome(credencial: { accessToken: string; merchantId?: string | null }) {
  try {
    const resposta = await fetch(
      `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${credencial.merchantId}`,
      {
        headers: { authorization: `Bearer ${credencial.accessToken}` },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!resposta.ok) return null;
    const loja = (await resposta.json()) as { name?: string };
    return loja.name ?? null;
  } catch {
    return null;
  }
}
