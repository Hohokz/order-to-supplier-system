import { z } from 'zod';

export const SearchInventoryInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  filters: z.object({
    inventoryName: z.string().optional(),
    supplierName: z.string().optional(),
    status: z.string().optional()
  }).optional(),
});

export type SearchInventoryDto = z.infer<typeof SearchInventoryInput>;