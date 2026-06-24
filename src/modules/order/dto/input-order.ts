import { z } from 'zod';
import { OrderSignatureIsEmpty } from '../order.error';

export const CreateOrderInput = z.object({
  signature: z.string().min(1, new OrderSignatureIsEmpty),
  items: z.array(z.object({
    inventory_id: z.string(),
    quantity: z.number().int().min(1),
    order_quantity: z.number().int().min(1),
    delivery_when: z.string().min(1)
  })).min(1, "Order must have at least one item"),
});

export type CreateOrderPayload = z.infer<typeof CreateOrderInput>;