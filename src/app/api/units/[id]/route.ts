import { NextRequest } from 'next/server';
import { unitsController } from '@/modules/units/unit.controller';

// 1. ประกาศ Params เป็น Union Type ที่รองรับทั้งแบบเก่าและแบบใหม่
type RouteParams = Promise<{ id: string }> | { id: string };

export async function GET(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  // 2. ใช้ await ต่อหน้า params เพื่อให้ได้ค่า Object ออกมา ไม่ว่ามันจะเป็น Promise หรือ Object อยู่แล้ว
  const resolvedParams = await params;
  return unitsController.getById(req, resolvedParams);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const resolvedParams = await params;
  return unitsController.update(req, resolvedParams);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const resolvedParams = await params;
  return unitsController.delete(req, resolvedParams);
}