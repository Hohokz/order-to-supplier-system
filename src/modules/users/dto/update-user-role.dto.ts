import { z } from 'zod';
import { USER_ROLES } from '../entities/user.entities';

export const updateRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;