import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { CreateUnitInput, UpdateUnitInput } from './dto/input-unit.dto';

extendZodWithOpenApi(z);

export const openapiList = [
  {
    method: 'get',
    path: '/api/units',
    tags: ['Units'],
    summary: 'ดึงข้อมูลหน่วยนับทั้งหมด (พร้อม Pagination)',
  },
  {
    method: 'get',
    path: '/api/units/{id}',
    tags: ['Units'],
    summary: 'ดึงข้อมูลหน่วยนับตาม ID',
  },
  {
    method: 'post',
    path: '/api/units',
    tags: ['Units'],
    summary: 'สร้างหน่วยนับใหม่ (เฉพาะ APPROVER)',
    requestBody: CreateUnitInput,
  },
  {
    method: 'put',
    path: '/api/units/{id}',
    tags: ['Units'],
    summary: 'แก้ไขข้อมูลหน่วยนับ (เฉพาะ APPROVER)',
    requestBody: UpdateUnitInput,
  },
  {
    method: 'delete',
    path: '/api/units/{id}',
    tags: ['Units'],
    summary: 'ลบหน่วยนับ (เฉพาะ APPROVER)',
  },
];