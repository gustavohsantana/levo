import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  assinaturaConfere,
  dadosDoEvento,
  lerEvento,
} from '@/infrastructure/integrations/99food/webhook-protocol';

/**
 * As duas regras do webhook do 99Food que a homologação cobra e que quebram
 * caladas: id grande e assinatura.
 *
 * Os números usados aqui são reais — o APP ID é o do app "Levô" no portal, e o
 * order id é o exemplo que a própria documentação deles dá para explicar o
 * problema.
 */

const APP_ID_REAL = '5764607591429179549';
const ORDER_ID_DA_DOC = '5764607801871631353';
const SEGREDO = 'segredo-de-teste';

function assinar(corpo: string, segredo = SEGREDO): string {
  return createHash('md5').update(corpo + segredo, 'utf8').digest('hex');
}

describe('leitura do corpo (bigint)', () => {
  it('preserva id de 19 dígitos que o JSON.parse corromperia', () => {
    const raw = `{"app_id":${APP_ID_REAL},"app_shop_id":"loja-1","type":"orderNew","data":{"order_id":${ORDER_ID_DA_DOC}}}`;

    // A prova de que o problema é real: o parse nativo perde a precisão.
    expect(String(JSON.parse(raw).app_id)).not.toBe(APP_ID_REAL);

    const evento = lerEvento(raw);
    expect(evento.app_id).toBe(APP_ID_REAL);

    const dados = dadosDoEvento(evento) as { order_id: string };
    expect(dados.order_id).toBe(ORDER_ID_DA_DOC);
  });

  it('aceita `data` vindo como string JSON, que a doc permite', () => {
    const raw = `{"type":"orderNew","data":"{\\"order_id\\":${ORDER_ID_DA_DOC}}"}`;

    const dados = dadosDoEvento(lerEvento(raw)) as { order_id: string };
    expect(dados.order_id).toBe(ORDER_ID_DA_DOC);
  });

  it('devolve a string crua quando `data` não é JSON', () => {
    const evento = lerEvento('{"type":"ping","data":"pong"}');
    expect(dadosDoEvento(evento)).toBe('pong');
  });
});

describe('assinatura', () => {
  const corpo = `{"app_id":${APP_ID_REAL},"type":"orderNew"}`;

  it('aceita a assinatura que o 99Food geraria', () => {
    expect(assinaturaConfere(corpo, assinar(corpo), SEGREDO)).toBe(true);
  });

  it('aceita em maiúsculas — hex é o mesmo valor', () => {
    expect(assinaturaConfere(corpo, assinar(corpo).toUpperCase(), SEGREDO)).toBe(true);
  });

  it('recusa corpo adulterado', () => {
    const assinatura = assinar(corpo);
    const adulterado = corpo.replace('orderNew', 'orderCancel');
    expect(assinaturaConfere(adulterado, assinatura, SEGREDO)).toBe(false);
  });

  it('recusa assinatura feita com outro segredo', () => {
    expect(assinaturaConfere(corpo, assinar(corpo, 'outro'), SEGREDO)).toBe(false);
  });

  it('recusa quando o header não veio', () => {
    expect(assinaturaConfere(corpo, null, SEGREDO)).toBe(false);
  });

  it('recusa assinatura de tamanho errado sem estourar', () => {
    expect(assinaturaConfere(corpo, 'abc', SEGREDO)).toBe(false);
  });
});
