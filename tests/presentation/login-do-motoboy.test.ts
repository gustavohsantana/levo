import { describe, expect, it } from 'vitest';
import { loginFromName } from '@/presentation/courier-login-id';

describe('usuario do app do motoboy', () => {
  it('usa o primeiro nome, sem acento', () => {
    expect(loginFromName('Jefferson Alves')).toBe('jefferson');
    expect(loginFromName('José da Silva')).toBe('jose');
  });

  it('cai no nome inteiro quando o primeiro é curto demais', () => {
    expect(loginFromName('Lu Silva')).toBe('lusilva');
  });

  it('tem um fallback quando o nome não dá letra', () => {
    expect(loginFromName('---')).toBe('moto');
  });
});
