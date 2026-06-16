import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateUnitInput = z.object({
    unit: z.string().min(1, 'กรุณาระบุหน่วยนับที่ต้องการใช้').max(100),
    unit_name: z.string().min(1, 'กรุณาระบุชื่อหน่วยนับ').max(100),
});

export const UpdateUnitInput = z.object({
    unit_name: z.string().min(1, 'กรุณาระบุชื่อหน่วยนับ').max(100).optional(),
});

export type CreateUnitDto = z.infer<typeof CreateUnitInput>;
export type UpdateUnitDto = z.infer<typeof UpdateUnitInput>;

export type CreateUnitPayload = CreateUnitDto & { createdBy: string };
export type UpdateUnitPayload = UpdateUnitDto & { updatedBy: string };