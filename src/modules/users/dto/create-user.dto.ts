import { z } from 'zod';

export const createProfileSchema = z.object({
    username: z.string().min(1),
    password_hash: z.string().min(8, 'Password must be at least 8 characters'),
    line_id: z.string().min(1),
    name: z.string().min(1),
    user_role: z.enum(['APPROVER', 'OBSERVER']).default('OBSERVER'),
});

export type CreateProfileDto = z.infer<typeof createProfileSchema>;