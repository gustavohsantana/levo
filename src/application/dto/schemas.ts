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
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Informe o nome do cliente'),
  customerPhone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().min(8, 'Endereço muito curto para ser localizado'),
  reference: z.string().trim().optional().or(z.literal('')),
  amountReais: brlAmount,
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  items: z.array(orderItemSchema).optional(),
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
