import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateSupplierInput = z.object({
  supplier_name: z.string().max(255),
  contract_person: z.string().max(255),
  phone: z.string().max(20),
  email: z.string().email(),
  address: z.string().max(255),
  tax_id: z.string().max(20),
  status: z.enum(['ACTIVE', 'CHANGED', 'INACTIVE']), // ใส่ default ใน DB ได้
});

export const UpdateSupplierInput = z.object({
  supplier_name: z.string().min(1),
  contract_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  tax_id: z.string().max(13, { message: "Tax ID must be maximum 13 characters" }).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type CreateSupplierDto = z.infer<typeof CreateSupplierInput>;
export type UpdateSupplierDto = z.infer<typeof UpdateSupplierInput>;

export type CreateSupplierPayload = CreateSupplierDto & { createdBy: string };
export type UpdateSupplierPayload = UpdateSupplierDto & { updatedBy: string };