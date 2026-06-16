import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { INVENTORY_STATUS } from '../entities/inventory.entities';
extendZodWithOpenApi(z);

export const CreateInventoryInput = z.object({
  inventory_name: z.string().min(1, 'กรุณาระบุชื่อสินค้า/วัตถุดิบ').max(255),
  inventory_quantity: z.number().min(0, 'จำนวนต้องไม่ติดลบ'),
  unit_price: z.number().min(0, 'ราคาต่อหน่วยต้องไม่ติดลบ'),
  status: z.enum(INVENTORY_STATUS).optional().default('ACTIVE'),
  supplier_id: z.string().uuid('รูปแบบ Supplier ID ไม่ถูกต้อง'),
  unit_id: z.string(),
  delivery_when: z.string().min(1, 'กรุณาระบุเวลาจัดส่ง').openapi({
    example: '2026-06-20T10:00:00.000Z',
    description: 'วันที่และเวลาที่จะจัดส่ง'
  }),
});

export const UpdateInventoryInput = CreateInventoryInput.partial();

export type CreateInventoryDto = z.infer<typeof CreateInventoryInput>;
export type UpdateInventoryDto = z.infer<typeof UpdateInventoryInput>;

export type CreateInventoryPayload = CreateInventoryDto & { createdBy: string };
export type UpdateInventoryPayload = UpdateInventoryDto & { updatedBy: string };