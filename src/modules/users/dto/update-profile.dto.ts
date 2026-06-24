import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  username: z.string().trim().min(1).max(255).optional(),
  line_id: z.string().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

// 💡 แก้ไขจุดนี้: เอาฟิลด์วันที่ออกไป เพราะฝั่ง Repository และ Database จะเป็นคนจัดการให้เองอัตโนมัติ
export const CreateUserSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  passwordHash: z.string().min(1, 'Password hash is required'),
  name: z.string().min(1, 'Name is required'),
  lineId: z.string().default(''),
  userRole: z.enum(["APPROVER", "OBSERVER"]),
  companyName: z.string().min(1, 'Company name is required'),
});

export const UpdateUserDto = z.object({
  name: z.string(),
  username: z.string(),
  lineId: z.string(),
  companyName: z.string(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateUserDto>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;