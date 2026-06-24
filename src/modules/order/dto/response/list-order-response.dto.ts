import { z } from 'zod';

// 1. กำหนด Schema ย่อยสำหรับรายการสินค้า (Item)
export const OrderItemResponseSchema = z.object({
    id: z.string().min(1),
    inventory_id: z.string().min(1),
    inventory_name: z.string(),
    unit: z.string(),
    unit_name: z.string(),
    quantity: z.number().int(),
    order_quantity: z.number().int(),
    delivery_when: z.string(),
});

// 2. กำหนด Schema สำหรับ Order หลัก
export const OrderResponseSchema = z.object({
    id: z.number(),
    signature: z.string(),
    created_date: z.date(),
    created_by: z.string(),
    order_date: z.date(),
    supplier_name: z.string(),
    items: z.array(OrderItemResponseSchema), // เชื่อมโยงกันที่นี่
});

// 3. Export เป็น Type ให้ใช้งานในโค้ด
export type OrderResponse = z.infer<typeof OrderResponseSchema>;
export type OrderItemResponse = z.infer<typeof OrderItemResponseSchema>;