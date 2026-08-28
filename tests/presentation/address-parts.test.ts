import { describe, expect, it } from 'vitest';
import { cidadeDoReverso } from '@/infrastructure/geocoding/city-from-reverse';
import { montarEndereco } from '@/presentation/address-parts';

describe('montarEndereco', () => {
  it('junta rua, número, bairro e cidade no formato que o mapa já entende', () => {
    expect(
      montarEndereco({
        rua: 'Av Waldemar de Azevedo Junqueira',
        numero: '100',
        bairro: 'Santa Edwirges',
        cidade: 'Pouso Alegre',
      }),
    ).toBe('Av Waldemar de Azevedo Junqueira, 100 - Santa Edwirges, Pouso Alegre');
  });

  it('aceita número s/n', () => {
    expect(
      montarEndereco({
        rua: 'Rua das Flores',
        numero: 's/n',
        bairro: 'Centro',
        cidade: 'Pouso Alegre',
      }),
    ).toBe('Rua das Flores, s/n - Centro, Pouso Alegre');
  });
});

describe('cidadeDoReverso', () => {
  it('prefere city, depois town e municipality', () => {
    expect(cidadeDoReverso({ city: 'Pouso Alegre' })).toBe('Pouso Alegre');
    expect(cidadeDoReverso({ town: 'Borda da Mata' })).toBe('Borda da Mata');
    expect(cidadeDoReverso({ municipality: 'Congonhal' })).toBe('Congonhal');
    expect(cidadeDoReverso({})).toBeNull();
  });
});
