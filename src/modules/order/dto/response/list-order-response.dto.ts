import { z } from 'zod';

export const ListOrderResponseDto = z.object({
    id: z.string().min(1), 
    inventory_name: z.string(),
    supplier_name: z.string(),
    delivery_when: z.string(),
    unit: z.string(),
    unit_name: z.string(),
    quantity: z.number().int(),
    order_quantity: z.number().int()

});

export type ListOrderResponse = z.infer<typeof ListOrderResponseDto>;