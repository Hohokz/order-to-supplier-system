import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { USER_ROLES } from '../entities/user.entities';

extendZodWithOpenApi(z);

export const updateRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;