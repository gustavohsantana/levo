import { describe, expect, it } from 'vitest';
import { clockTime, currency, distance, minutes, phoneDisplay } from '@/presentation/ui/format';

describe('clockTime', () => {
  /*
   * O fuso precisa ser fixo. Sem isso o horário sai diferente no servidor
   * (Vercel, UTC) e no navegador do dono (UTC-3) — o React acusa divergência de
   * hidratação e, pior, o pedido aparece três horas fora do lugar.
   */
  it('usa o horário de Brasília, não o do ambiente', () => {
    // 21:42 UTC é 18:42 em São Paulo.
    expect(clockTime('2026-08-24T21:42:00Z')).toBe('18:42');
  });

  it('atravessa a virada do dia sem quebrar', () => {
    // 02:30 UTC ainda é o dia anterior, 23:30, no Brasil.
    expect(clockTime('2026-08-25T02:30:00Z')).toBe('23:30');
  });

  it('aceita Date e string com o mesmo resultado', () => {
    const iso = '2026-08-24T17:54:00Z';
    expect(clockTime(iso)).toBe(clockTime(new Date(iso)));
  });
});

describe('minutes', () => {
  it('mostra minutos abaixo de uma hora', () => {
    expect(minutes(1080)).toBe('18 min');
  });

  it('quebra em horas quando passa de 60 minutos', () => {
    expect(minutes(3600)).toBe('1 h');
    expect(minutes(5400)).toBe('1 h 30 min');
  });
});

describe('distance', () => {
  it('usa metros abaixo de 1 km', () => {
    expect(distance(850)).toBe('850 m');
  });

  it('usa quilômetros com uma casa decimal', () => {
    expect(distance(23_500)).toBe('23,5 km');
  });
});

describe('currency', () => {
  it('formata em real, a partir de centavos', () => {
    expect(currency(8990).replace(/ /g, ' ')).toBe('R$ 89,90');
  });
});

describe('phoneDisplay', () => {
  it('formata celular com nove dígitos', () => {
    expect(phoneDisplay('35988880001')).toBe('(35) 98888-0001');
  });

  it('formata fixo com oito dígitos', () => {
    expect(phoneDisplay('3532221234')).toBe('(35) 3222-1234');
  });
});
