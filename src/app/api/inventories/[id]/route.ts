import { NextRequest } from 'next/server';
import { inventoriesController } from '@/modules/inventories/inventory.controller';

// ใช้ Promise ในการรับ params
type RouteParams = Promise<{ id: string }>;

export async function GET(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  // ต้อง await params ก่อนนำไปใช้งาน
  const resolvedParams = await params;
  return inventoriesController.getById(req, resolvedParams);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const resolvedParams = await params;
  return inventoriesController.update(req, resolvedParams);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const resolvedParams = await params;
  return inventoriesController.delete(req, resolvedParams);
}