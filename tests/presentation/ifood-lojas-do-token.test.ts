import { describe, expect, it } from 'vitest';

/**
 * O `merchant_scope` do token é a fonte de verdade sobre quais lojas
 * autorizaram o aplicativo.
 *
 * `GET /merchant/v1.0/merchants` responde 200 com lista vazia quando a loja não
 * concedeu o módulo Merchant — e a vinculação morria aí dizendo "nenhuma loja
 * encontrada nesta conta". Tinha loja: o id estava dentro do token.
 *
 * A função é interna à server action, então o teste exercita a leitura do claim
 * pela mesma lógica, que é a parte com risco de errar.
 */
function lojasDoToken(accessToken: string): Array<{ id: string; nome: string }> {
  const corpo = accessToken.split('.')[1];
  if (!corpo) return [];

  try {
    const claims = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')) as {
      merchant_scope?: unknown;
    };

    if (!Array.isArray(claims.merchant_scope)) return [];

    const ids = new Set(
      claims.merchant_scope
        .map((entrada) => String(entrada).split(':')[0])
        .filter((id) => id.length > 0),
    );

    return [...ids].map((id) => ({ id, nome: id }));
  } catch {
    return [];
  }
}

function token(claims: unknown): string {
  return `cabecalho.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.assinatura`;
}

const LOJA = 'c2e2bdc7-033e-4dfe-9fe6-4a1384d6a423';

describe('lojas declaradas no token do iFood', () => {
  it('extrai o id da loja do merchant_scope', () => {
    expect(lojasDoToken(token({ merchant_scope: [`${LOJA}:events`] }))).toEqual([
      { id: LOJA, nome: LOJA },
    ]);
  });

  it('não repete a loja quando ela concede vários módulos', () => {
    // O mesmo id aparece uma vez por módulo — `["id:events", "id:order"]`.
    const t = token({ merchant_scope: [`${LOJA}:events`, `${LOJA}:order`] });

    expect(lojasDoToken(t)).toHaveLength(1);
  });

  it('lê várias lojas', () => {
    const t = token({ merchant_scope: [`${LOJA}:events`, 'outra-loja:events'] });

    expect(lojasDoToken(t).map((l) => l.id)).toEqual([LOJA, 'outra-loja']);
  });

  it('devolve vazio quando o token não declara loja', () => {
    expect(lojasDoToken(token({ scope: ['events'] }))).toEqual([]);
    expect(lojasDoToken(token({ merchant_scope: [] }))).toEqual([]);
  });

  it('não estoura com token opaco ou corpo ilegível', () => {
    expect(lojasDoToken('sem-pontos')).toEqual([]);
    expect(lojasDoToken('cabecalho.nao-e-json.assinatura')).toEqual([]);
  });
});
