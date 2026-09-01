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
  imageUrl: string | null;
  active: boolean;
  /**
   * Posição dentro da categoria. Menor primeiro, empate desempata pelo nome.
   *
   * Ordem de cardápio é decisão comercial: o que vende mais fica em cima. Sem
   * isto a lista sai em ordem alfabética, e uma pizzaria abre com "Açaí".
   */
  position: number;
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
    imageUrl?: string | null;
    active?: boolean;
    position?: number;
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
      imageUrl: input.imageUrl?.trim() || null,
      active: input.active ?? true,
      position: input.position ?? 0,
      source: input.source ?? 'MANUAL',
      externalId: input.externalId ?? null,
    });
  }

  static restore(props: ProductProps): Product {
    return new Product(props);
  }

  get establishmentId() { return this.props.establishmentId; }
  get position() { return this.props.position; }

  /** Troca de lugar na categoria. Quem decide a ordem é a tela, não a entidade. */
  moverPara(position: number): void {
    this.props.position = position;
  }

  get name() { return this.props.name; }
  get description() { return this.props.description; }
  get price() { return this.props.price; }
  get category() { return this.props.category; }
  get imageUrl() { return this.props.imageUrl; }
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
    imageUrl?: string | null;
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
    if (input.imageUrl !== undefined) this.props.imageUrl = input.imageUrl?.trim() || null;
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
