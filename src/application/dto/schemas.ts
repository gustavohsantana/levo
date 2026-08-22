import { z } from 'zod';

/**
 * Fonte única de verdade da validação.
 *
 * O mesmo schema valida o formulário no navegador e a requisição no servidor.
 * Regra de validação duplicada é regra que diverge — e quando diverge, quem
 * ganha é a do cliente, que é justamente a que não vale nada.
 */

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Informe o nome do cliente'),
  customerPhone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().min(8, 'Endereço muito curto para ser localizado'),
  reference: z.string().trim().optional().or(z.literal('')),
  amountReais: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

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
