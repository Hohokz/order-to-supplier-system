import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const SearchSupplierInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  filters: z.object({
    supplierName: z.string().optional(),
  }).optional(),
});

export type ListSuppliersQueryDto = z.infer<typeof SearchSupplierInput>;