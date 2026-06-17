import { z } from 'zod';

export const SearchOrderInput = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  filters: z.object({
    orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
    approvedBy: z.string().optional(),
    signature: z.string().optional(),
  }).optional(),
});