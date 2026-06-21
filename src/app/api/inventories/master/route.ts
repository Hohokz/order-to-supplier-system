import { NextRequest } from 'next/server';
import { inventoriesController } from '@/modules/inventories/inventory.controller';

export async function POST(req: NextRequest) {
  return inventoriesController.master(req);
}