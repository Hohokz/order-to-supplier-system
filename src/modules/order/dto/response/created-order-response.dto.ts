import { z } from 'zod';



export const CreateOrderItemResponseDto = z.object({
    id: z.number().int(),
    inventory_id: z.string(),
    inventory_name: z.string().min(1),
    quantity: z.number().int().min(1),
    order_quantity: z.number().int().min(1),
});

export const CreateOrderResponseDto = z.object({
    id: z.number().int(),
    signature: z.string().min(1),
    order_date: z.date(),
    is_approve: z.boolean(),
    approve_date: z.date().nullable(),
    approved_by: z.string().nullable(),
    order_item: z.array(CreateOrderItemResponseDto)
});

// สร้าง Type ไว้ใช้งาน
export type CreateOrderResponse = z.infer<typeof CreateOrderResponseDto>;
export type CreateOrderItemResponse = z.infer<typeof CreateOrderItemResponseDto>;