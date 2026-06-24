import { z } from 'zod';

export const SearchOrderInput = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  filters: z.object({
    orderDate: z.string()
      .or(z.literal(''))
      .or(z.literal('null'))
      .or(z.literal('undefined'))
      .optional()
      .transform(val => {
        if (val === '' || val === 'null' || val === 'undefined') return undefined;
        return val;
      }), // YYYY-MM-DD
    approvedBy: z.string().optional(),
    signature: z.string().optional(),
  }).optional(),
});