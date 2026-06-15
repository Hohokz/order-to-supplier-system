import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  username: z.string().trim().min(1).max(255).optional(),
  line_id: z.string().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;