import { ValidationError } from '../errors';
import { Money } from '../value-objects';
import { Entity } from './entity';
import type { OrderSourceKind } from './order';

/**
 * Um item que o estabelecimento vende.
 *
 * O catálogo é da plataforma, não espelho de marketplace: ele existe para o
 * pedido que nenhum aplicativo cobre — o cliente que liga ou manda mensagem.
 * Importar do iFood preenche a lista, mas o produto passa a ser nosso.
 */
export interface ProductProps {
  id: string;
  establishmentId: string;
  name: string;
  description: string | null;
  price: Money;
  category: string | null;
  active: boolean;
  source: OrderSourceKind;
  externalId: string | null;
}

export class Product extends Entity {
  private constructor(private props: ProductProps) {
    super(props.id);
  }

  static create(input: {
    id: string;
    establishmentId: string;
    name: string;
    description?: string | null;
    price: Money;
    category?: string | null;
    active?: boolean;
    source?: OrderSourceKind;
    externalId?: string | null;
  }): Product {
    const name = input.name.trim();

    // Produto sem nome é uma linha em branco na lista de quem está atendendo
    // ao telefone — pior que não existir.
    if (name.length < 2) {
      throw new ValidationError('O produto precisa de um nome', { name: input.name });
    }

    return new Product({
      id: input.id,
      establishmentId: input.establishmentId,
      name,
      description: input.description?.trim() || null,
      price: input.price,
      category: input.category?.trim() || null,
      active: input.active ?? true,
      source: input.source ?? 'MANUAL',
      externalId: input.externalId ?? null,
    });
  }

  static restore(props: ProductProps): Product {
    return new Product(props);
  }

  get establishmentId() { return this.props.establishmentId; }
  get name() { return this.props.name; }
  get description() { return this.props.description; }
  get price() { return this.props.price; }
  get category() { return this.props.category; }
  get active() { return this.props.active; }
  get source() { return this.props.source; }
  get externalId() { return this.props.externalId; }

  /** Veio de marketplace; editar aqui não escreve de volta lá. */
  get importado(): boolean {
    return this.props.source !== 'MANUAL';
  }

  edit(input: {
    name?: string;
    description?: string | null;
    price?: Money;
    category?: string | null;
  }): void {
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 2) {
        throw new ValidationError('O produto precisa de um nome', { name: input.name });
      }
      this.props.name = name;
    }

    if (input.description !== undefined) this.props.description = input.description?.trim() || null;
    if (input.price !== undefined) this.props.price = input.price;
    if (input.category !== undefined) this.props.category = input.category?.trim() || null;
  }

  /**
   * Sair da lista sem apagar.
   *
   * Item fora de estoque ou sazonal volta depois, e apagar levaria junto a
   * referência dos pedidos que já o usaram.
   */
  setActive(active: boolean): void {
    this.props.active = active;
  }

  toJSON() {
    return { ...this.props, price: this.props.price.cents };
  }
}
