import { ValidationError } from '../errors';

/** Valor em centavos. Float com dinheiro é bug esperando a hora certa. */
export class Money {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new ValidationError('Valor monetário inválido', { cents });
    }
    return new Money(cents);
  }

  static fromReais(reais: number): Money {
    return Money.fromCents(Math.round(reais * 100));
  }

  static zero(): Money {
    return new Money(0);
  }

  get reais(): number {
    return this.cents / 100;
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  get formatted(): string {
    return this.reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  toJSON() {
    return this.cents;
  }
}
