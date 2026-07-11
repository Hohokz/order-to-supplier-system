import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateSupplierInput = z.object({
  supplier_name: z.string().max(255), // คงชื่อไว้เป็น Required (หากต้องการให้ว่างได้ ให้เติม .optional().or(z.literal('')) ต่อท้าย)
  contract_person: z.string().max(255).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  tax_id: z.string().max(20).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'CHANGED', 'INACTIVE']).optional(), // ใส่ default ใน DB ได้
});

export const UpdateSupplierInput = z.object({
  supplier_name: z.string().min(1).optional().or(z.literal('')),
  contract_person: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  tax_id: z.string().max(13, { message: "Tax ID must be maximum 13 characters" }).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type CreateSupplierDto = z.infer<typeof CreateSupplierInput>;
export type UpdateSupplierDto = z.infer<typeof UpdateSupplierInput>;

export type CreateSupplierPayload = CreateSupplierDto & { createdBy: string };
export type UpdateSupplierPayload = UpdateSupplierDto & { updatedBy: string };