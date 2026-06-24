import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { INVENTORY_STATUS } from '../../entities/inventory.entities';

extendZodWithOpenApi(z);

// Define Object schemas
const SupplierSchema = z.object({
  id: z.string().uuid(),
  supplier_name: z.string(),
});

const UnitSchema = z.object({
  id: z.string(),
  unit_name: z.string(),
});

export const GetInventoryByIdResponse = z.object({
  id: z.string().uuid(),
  inventory_name: z.string(),
  inventory_quantity: z.number(),
  unit_price: z.number(),
  status: z.enum(INVENTORY_STATUS),
  supplier: SupplierSchema,
  unit: UnitSchema,
  created_date: z.date(),
  safety_quantity: z.number(),
});