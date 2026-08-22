import { ValidationError } from '../errors';

const MIN_LENGTH = 8;

export class Address {
  private constructor(
    readonly raw: string,
    readonly reference: string | null,
  ) {}

  static create(raw: string, reference?: string | null): Address {
    const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ');
    if (trimmed.length < MIN_LENGTH) {
      throw new ValidationError('Endereço muito curto para ser localizado', { raw });
    }
    return new Address(trimmed, reference?.trim() || null);
  }

  /**
   * Chave de cache da geocodificação.
   *
   * "Av. Sete de Setembro, 1234" e "AVENIDA SETE DE SETEMBRO 1234" são o mesmo
   * lugar e não podem gastar duas chamadas de API. Como um bairro concentra os
   * mesmos endereços noite após noite, essa normalização é o que mantém o
   * consumo dentro da faixa gratuita do geocodificador.
   */
  get cacheKey(): string {
    return this.raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .toLowerCase()
      .replace(/\b(av|avenida|r|rua|al|alameda|tv|travessa|pca|praca)\b\.?/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /** O que vai para o geocodificador: sem o ponto de referência, que só confunde. */
  get searchable(): string {
    return this.raw;
  }

  toString(): string {
    return this.raw;
  }

  toJSON() {
    return { raw: this.raw, reference: this.reference };
  }
}
