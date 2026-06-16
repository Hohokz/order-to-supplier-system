import { CreateSupplierInput, UpdateSupplierInput } from '@/modules/suppliers/dto/input-supplier.dto';
export const openapiList = [
  {
    path: '/api/suppliers',
    method: 'post',
    summary: 'Create a new supplier',
    tags: ['Suppliers'],
    requestBody: CreateSupplierInput
  },
  {
    method: 'get',
    path: '/api/suppliers/[id]',
    tags: ['Suppliers'],
    summary: 'Get supplier by ID',
  },
  {
    method: 'put',
    path: '/api/suppliers/[id]',
    summary: 'Update supplier',
    tags: ['Suppliers'],
    requestBody: UpdateSupplierInput
  },
  {
    method: 'delete',
    path: '/api/suppliers/[id]',
    tags: ['Suppliers'],
    summary: 'Delete supplier',
  }

];