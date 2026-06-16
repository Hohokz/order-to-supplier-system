import { NextRequest } from 'next/server';
import { inventoriesController } from '@/modules/inventories/inventory.controller';
import { inventoryOpenapiList } from '@/modules/inventories/inventory.openapi';

export const openapiList = inventoryOpenapiList;

export async function POST(req: NextRequest) {
  return inventoriesController.list(req);
}