import { InvalidPhoneError } from '../errors';

/**
 * Telefone brasileiro normalizado.
 *
 * A entrada vem de humano com pressa: "(41) 99999-9999", "41999999999",
 * "+55 41 9999-9999", "041 99999 9999". Todas precisam virar a mesma coisa,
 * porque é essa string que monta o link do WhatsApp — e link errado é entrega
 * sem aviso.
 */
export class PhoneNumber {
  /** Sempre 10 (fixo) ou 11 (celular) dígitos: DDD + número, sem país. */
  private constructor(private readonly national: string) {}

  static create(raw: string): PhoneNumber {
    let digits = (raw ?? '').replace(/\D/g, '');

    // Código do país
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      digits = digits.slice(2);
    }
    // Zero de operadora ("041 9999...")
    if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
      digits = digits.slice(1);
    }

    if (digits.length !== 10 && digits.length !== 11) throw new InvalidPhoneError(raw);

    const ddd = Number(digits.slice(0, 2));
    if (ddd < 11 || ddd > 99) throw new InvalidPhoneError(raw);

    // Celular tem 11 dígitos e o nono sempre é 9.
    if (digits.length === 11 && digits[2] !== '9') throw new InvalidPhoneError(raw);

    return new PhoneNumber(digits);
  }

  static tryCreate(raw: string): PhoneNumber | null {
    try {
      return PhoneNumber.create(raw);
    } catch {
      return null;
    }
  }

  get value(): string {
    return this.national;
  }

  get ddd(): string {
    return this.national.slice(0, 2);
  }

  get isMobile(): boolean {
    return this.national.length === 11;
  }

  /** Formato exigido pelo `wa.me`: dígitos, com país, sem `+`. */
  get whatsapp(): string {
    return `55${this.national}`;
  }

  get e164(): string {
    return `+55${this.national}`;
  }

  /** Para exibir na tela: (41) 99999-9999 */
  get formatted(): string {
    const rest = this.national.slice(2);
    const split = this.isMobile ? 5 : 4;
    return `(${this.ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
  }

  equals(other: PhoneNumber): boolean {
    return this.national === other.national;
  }

  toJSON() {
    return this.national;
  }
}
