import { createHmac, timingSafeEqual } from 'node:crypto';
import { describe, expect, it } from 'vitest';

/**
 * A validação da assinatura do webhook do iFood.
 *
 * Rejeitar assinatura inválida é item explícito da homologação — e a razão é
 * óbvia quando se pensa no que o endpoint faz: sem validar, qualquer um manda
 * um POST forjado e injeta pedido falso na operação de um restaurante.
 *
 * A lógica é replicada aqui em vez de importada da rota porque o route handler
 * do Next carrega ambiente de servidor inteiro; o que precisa ser garantido é a
 * regra criptográfica.
 */
function verify(raw: string, provided: string | null, secret: string): boolean {
  if (!provided) return false;

  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided.trim().toLowerCase(), 'utf8');

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const SECRET = 'segredo-do-cliente-ifood';
const CORPO = JSON.stringify({ id: 'ev-1', code: 'PLC', orderId: 'pedido-1' });

function assinar(corpo: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(corpo).digest('hex');
}

describe('assinatura do webhook do iFood', () => {
  it('aceita corpo com assinatura correta', () => {
    expect(verify(CORPO, assinar(CORPO), SECRET)).toBe(true);
  });

  it('recusa corpo sem assinatura', () => {
    expect(verify(CORPO, null, SECRET)).toBe(false);
  });

  it('recusa assinatura de outro segredo', () => {
    // O cenário real: alguém descobriu a URL e forja eventos.
    expect(verify(CORPO, assinar(CORPO, 'segredo-errado'), SECRET)).toBe(false);
  });

  it('recusa quando o corpo foi alterado depois de assinado', () => {
    const assinatura = assinar(CORPO);
    const adulterado = JSON.stringify({ id: 'ev-1', code: 'PLC', orderId: 'OUTRO-PEDIDO' });

    expect(verify(adulterado, assinatura, SECRET)).toBe(false);
  });

  it('aceita assinatura em maiúsculas', () => {
    // Hex é indiferente a caixa, e não vale recusar evento legítimo por isso.
    expect(verify(CORPO, assinar(CORPO).toUpperCase(), SECRET)).toBe(true);
  });

  it('recusa assinatura truncada sem estourar', () => {
    // Comprimento diferente precisa sair antes do timingSafeEqual, que lança
    // se os buffers não tiverem o mesmo tamanho.
    expect(() => verify(CORPO, assinar(CORPO).slice(0, 20), SECRET)).not.toThrow();
    expect(verify(CORPO, assinar(CORPO).slice(0, 20), SECRET)).toBe(false);
  });

  it('a assinatura cobre os bytes exatos, não o objeto', () => {
    /*
     * Reserializar depois de um JSON.parse muda espaços e ordem de chaves, e a
     * verificação passa a falhar sempre — por um motivo que não aparece no log.
     * Daí a rota ler o corpo cru antes de qualquer parse.
     */
    const reserializado = JSON.stringify(JSON.parse(`{"code":"PLC","id":"ev-1"}`));
    expect(verify(reserializado, assinar(`{"code":"PLC","id":"ev-1"}`), SECRET)).toBe(true);

    const comEspacos = `{ "code": "PLC", "id": "ev-1" }`;
    expect(verify(JSON.stringify(JSON.parse(comEspacos)), assinar(comEspacos), SECRET)).toBe(false);
  });
});
