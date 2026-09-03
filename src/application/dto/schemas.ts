import { z } from 'zod';

/**
 * Fonte única de verdade da validação.
 *
 * O mesmo schema valida o formulário no navegador e a requisição no servidor.
 * Regra de validação duplicada é regra que diverge — e quando diverge, quem
 * ganha é a do cliente, que é justamente a que não vale nada.
 */

/**
 * Valor em reais como um brasileiro digita.
 *
 * "45,50", "1.234,56", "R$ 89,90" — vírgula decimal e ponto de milhar. Sem
 * isto, `Number("45,50")` vira `NaN` e o formulário recusa exatamente o
 * formato que o próprio campo sugere no placeholder. É o tipo de detalhe que
 * não aparece em teste escrito em inglês e queima o produto na frente do
 * primeiro cliente.
 */
export const brlAmount = z.preprocess((raw) => {
  if (typeof raw !== 'string') return raw;

  const cleaned = raw.replace(/[^\d.,-]/g, '').trim();
  if (cleaned === '') return 0;

  // Com vírgula, ela é o separador decimal e os pontos são de milhar.
  // Sem vírgula, o ponto é o separador decimal.
  return cleaned.includes(',')
    ? Number(cleaned.replace(/\./g, '').replace(',', '.'))
    : Number(cleaned);
}, z.number().min(0, 'Valor não pode ser negativo').default(0));

/**
 * Itens vindos do catálogo.
 *
 * `amountReais` continua existindo ao lado: item fora do catálogo é caso real
 * — a promoção do dia, a taxa combinada por telefone — e obrigar o cadastro
 * antes de anotar o pedido transformaria conveniência em obstáculo.
 */
export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1, 'Quantidade precisa ser ao menos 1'),
  /** Desconto da linha em reais, já resolvido: a tela converte a porcentagem. */
  discountReais: z.number().min(0).optional(),
  /**
   * O que o cliente escolheu: ids de opção, por grupo.
   *
   * Só ids. Preço não trafega — ele é lido do banco no caso de uso, porque o
   * que chega daqui é entrada de fora e não fonte de verdade sobre dinheiro.
   */
  options: z.record(z.string(), z.array(z.string())).optional(),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Informe o nome do cliente'),
  customerPhone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().min(8, 'Endereço muito curto para ser localizado'),
  reference: z.string().trim().optional().or(z.literal('')),
  amountReais: brlAmount,
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  items: z.array(orderItemSchema).optional(),
  deliveryFeeReais: brlAmount.optional(),
  paymentMethod: z.enum(['CASH', 'CREDIT', 'DEBIT', 'PIX', 'ONLINE']).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const saveProductSchema = z.object({
  id: z.string().min(1).optional().or(z.literal('')),
  name: z.string().trim().min(2, 'O produto precisa de um nome'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  priceReais: brlAmount,
  category: z.string().trim().max(60).optional().or(z.literal('')),
  imageUrl: z.string().trim().url('Endereço de imagem inválido').optional().or(z.literal('')),
});
export type SaveProductInput = z.infer<typeof saveProductSchema>;

export const saveCourierSchema = z.object({
  id: z.string().min(1).optional().or(z.literal('')),
  name: z.string().trim().min(2, 'Informe o nome do entregador'),
  phone: z.string().trim().min(10, 'Telefone incompleto'),
  /*
   * Teto de 15 porque é o que o roteirizador aguenta bem, e porque acima disso a
   * última entrega sai fria de qualquer jeito. Piso de 1: motoboy que leva zero
   * pedidos é motoboy pausado, e para isso já existe botão.
   */
  maxStops: z.coerce
    .number()
    .int()
    .min(1, 'Pelo menos 1 pedido por viagem')
    .max(15, 'No máximo 15 por viagem')
    .default(15),
});
export type SaveCourierInput = z.infer<typeof saveCourierSchema>;

export const planRouteSchema = z.object({
  courierId: z.string().min(1, 'Escolha um motoboy'),
  orderIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos um pedido'),
});
export type PlanRouteInput = z.infer<typeof planRouteSchema>;

export const completeStopSchema = z.object({
  stopId: z.string().min(1),
  outcome: z.enum(['DELIVERED', 'FAILED']),
  reason: z.string().trim().max(300).nullish(),
  /** Quando veio da fila offline, é o horário real do toque, não o da sincronia. */
  occurredAt: z.coerce.date().optional(),
  /** O que o cliente ditou. Só exigido quando a loja liga a confirmação. */
  deliveryCode: z.string().trim().max(12).nullish(),
  /**
   * Onde ele estava ao confirmar.
   *
   * É o rastreio padrão: um ponto por entrega, com hora. Não segue ninguém pelo
   * dia, e prova o que precisa ser provado — que ele estava lá.
   */
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
});
export type CompleteStopInput = z.infer<typeof completeStopSchema>;

export const courierPingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  at: z.coerce.date().optional(),
});
export type CourierPingInput = z.infer<typeof courierPingSchema>;

export const webhookOrderSchema = z.object({
  externalId: z.string().min(1),
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().nullish(),
  address: z.string().trim().min(8),
  reference: z.string().trim().nullish(),
  amountCents: z.number().int().min(0).default(0),
  notes: z.string().trim().max(500).nullish(),
  placedAt: z.coerce.date().optional(),
});
export type WebhookOrderInput = z.infer<typeof webhookOrderSchema>;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(8, 'Senha de no mínimo 8 caracteres'),
});

/**
 * O cadastro de uma loja nova.
 *
 * Pede o mínimo que o sistema não consegue inventar sozinho. Tudo o mais —
 * taxa de entrega, horário, cardápio, motoboys — tem padrão e se ajusta depois,
 * porque formulário longo na primeira tela é onde o interessado desiste.
 *
 * O endereço é a exceção: ele é a origem de toda rota, e uma origem errada
 * estraga todo cálculo do produto em silêncio.
 */
export const cadastroSchema = z.object({
  nomeDaLoja: z.string().trim().min(2, 'Diga o nome da loja').max(60),
  endereco: z.string().trim().min(10, 'Endereço completo, com número e bairro'),
  cidade: z.string().trim().min(2, 'Diga a cidade'),
  estado: z
    .string()
    .trim()
    .length(2, 'A sigla do estado tem duas letras')
    .transform((s) => s.toUpperCase()),
  nome: z.string().trim().min(2, 'Diga o seu nome'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(8, 'Senha de no mínimo 8 caracteres'),
});
