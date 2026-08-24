import { describe, expect, it } from 'vitest';
import { ConfigurationError, NotFoundError } from '@/core';

describe('NotFoundError', () => {
  it('concorda em gênero com o recurso', () => {
    // "Parada não encontrado" apareceu de verdade na resposta da API.
    expect(new NotFoundError('Parada', 'x').message).toBe('Parada não encontrada');
    expect(new NotFoundError('Rota', 'x').message).toBe('Rota não encontrada');
    expect(new NotFoundError('Pedido', 'x').message).toBe('Pedido não encontrado');
    expect(new NotFoundError('Motoboy', 'x').message).toBe('Motoboy não encontrado');
    expect(new NotFoundError('Estabelecimento', 'x').message).toBe(
      'Estabelecimento não encontrado',
    );
  });

  it('leva recurso e id nos detalhes, para o cliente saber o que faltou', () => {
    expect(new NotFoundError('Pedido', 'abc').details).toEqual({
      resource: 'Pedido',
      id: 'abc',
    });
  });

  it('responde 404', () => {
    expect(new NotFoundError('Pedido', 'x').httpStatus).toBe(404);
  });
});

describe('ConfigurationError', () => {
  it('responde 503 — falta configuração deste lado, retentar não resolve', () => {
    const erro = new ConfigurationError('IFOOD: sem autorização');
    expect(erro.httpStatus).toBe(503);
    expect(erro.code).toBe('CONFIGURATION_ERROR');
  });
});
