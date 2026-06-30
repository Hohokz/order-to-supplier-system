import { z } from 'zod';

export const OrderItemResponseSchema = z.object({
  id: z.string().or(z.number()),
  inventory_name: z.string(),
  supplier_id: z.string().nullable().optional(),
  supplier_name: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  unit_name: z.string().nullable().optional(),
  quantity: z.number(),       
  order_quantity: z.number(), 
  approve_status: z.string(),
  approve_by: z.string().nullable().optional(),
  approve_date: z.any().nullable().optional()
});

export const OrderResponseSchema = z.object({
  id: z.number(),
  signature: z.string(),
  created_date: z.any(),
  created_by: z.string(),
  order_date: z.any(),
  supplier_name: z.string(),
  items: z.array(OrderItemResponseSchema)
});

// 🚀 เติมบรรทัดนี้ลงไปท้ายสุดของไฟล์เลยครับ เพื่อดึงไทป์จาก Zod ออกมาแจกจ่ายให้ไฟล์อื่นใช้งาน
export type OrderResponse = z.infer<typeof OrderResponseSchema>;