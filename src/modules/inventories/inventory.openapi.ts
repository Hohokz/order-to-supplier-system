import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { CreateInventoryInput, UpdateInventoryInput } from './dto/input-inventory.dto';

extendZodWithOpenApi(z);

export const inventoryOpenapiList = [
  {
    method: 'get',
    path: '/api/inventories',
    tags: ['Inventories'],
    summary: 'ดึงข้อมูลคลังสินค้าทั้งหมด',
  },
  {
    method: 'get',
    path: '/api/inventories/{id}',
    tags: ['Inventories'],
    summary: 'ดึงข้อมูลสินค้าตาม ID',
  },
  {
    method: 'post',
    path: '/api/inventories',
    tags: ['Inventories'],
    summary: 'เพิ่มสินค้าเข้าคลัง (เฉพาะ APPROVER)',
    requestBody: CreateInventoryInput,
  },
  {
    method: 'put',
    path: '/api/inventories/{id}',
    tags: ['Inventories'],
    summary: 'อัปเดตข้อมูลสินค้า (เฉพาะ APPROVER)',
    requestBody: UpdateInventoryInput,
  },
  {
    method: 'delete',
    path: '/api/inventories/{id}',
    tags: ['Inventories'],
    summary: 'ลบสินค้าออกจากคลัง (เฉพาะ APPROVER)',
  },
];