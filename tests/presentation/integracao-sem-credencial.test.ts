import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfigurationError } from '@/core';
import {
  AVISO_INTEGRACAO_SEM_CREDENCIAL,
  aiqfomePronto,
  ifoodPronto,
} from '@/presentation/integracao-disponivel';
import { toFormError } from '@/presentation/http/error-mapper';
import { AiqfomeConnect } from '@/presentation/ui/patterns/aiqfome-connect';
import { IfoodConnect } from '@/presentation/ui/patterns/ifood-connect';

describe('integração sem credencial', () => {
  it('iFood e aiqfome não estão prontos sem o par de credenciais', () => {
    expect(ifoodPronto({})).toBe(false);
    expect(ifoodPronto({ IFOOD_CLIENT_ID: 'app', IFOOD_CLIENT_SECRET: '' })).toBe(false);
    expect(ifoodPronto({ IFOOD_CLIENT_ID: 'app', IFOOD_CLIENT_SECRET: 'segredo' })).toBe(true);

    expect(aiqfomePronto({ aiqfomeEnabled: false })).toBe(false);
    expect(
      aiqfomePronto({
        aiqfomeEnabled: true,
        AIQFOME_CLIENT_ID: 'app',
      }),
    ).toBe(false);
    expect(
      aiqfomePronto({
        aiqfomeEnabled: false,
        AIQFOME_CLIENT_ID: 'app',
        AIQFOME_CLIENT_SECRET: 'segredo',
      }),
    ).toBe(false);
    expect(
      aiqfomePronto({
        aiqfomeEnabled: true,
        AIQFOME_CLIENT_ID: 'app',
        AIQFOME_CLIENT_SECRET: 'segredo',
      }),
    ).toBe(true);
  });

  it('a falta de credencial chega na tela em português, sem o erro genérico', () => {
    expect(toFormError(new ConfigurationError(AVISO_INTEGRACAO_SEM_CREDENCIAL))).toBe(
      AVISO_INTEGRACAO_SEM_CREDENCIAL,
    );

    const ifood = renderToStaticMarkup(
      createElement(IfoodConnect, { conectado: false, lojaAtual: null, disponivel: false }),
    );
    const aiqfome = renderToStaticMarkup(
      createElement(AiqfomeConnect, {
        conectado: false,
        lojaAtual: null,
        lojas: [],
        disponivel: false,
      }),
    );

    expect(ifood).toContain(AVISO_INTEGRACAO_SEM_CREDENCIAL);
    expect(ifood).not.toContain('Gerar código de conexão');
    expect(ifood).not.toContain('Algo deu errado');

    expect(aiqfome).toContain(AVISO_INTEGRACAO_SEM_CREDENCIAL);
    expect(aiqfome).not.toContain('/api/integrations/aiqfome/connect');
    expect(aiqfome).not.toContain('"code":"FORBIDDEN"');
  });

  it('com credencial, o caminho de conectar continua na tela', () => {
    const ifood = renderToStaticMarkup(
      createElement(IfoodConnect, { conectado: false, lojaAtual: null, disponivel: true }),
    );
    const aiqfome = renderToStaticMarkup(
      createElement(AiqfomeConnect, {
        conectado: false,
        lojaAtual: null,
        lojas: [],
        disponivel: true,
      }),
    );

    expect(ifood).toContain('Gerar código de conexão');
    expect(aiqfome).toContain('/api/integrations/aiqfome/connect');
    expect(aiqfome).toContain('Conectar aiqfome');
  });
});
