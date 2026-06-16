import { NextRequest } from 'next/server';
import { unitsController } from '@/modules/units/unit.controller';
export { openapiList } from '@/modules/units/unit.openapi';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return unitsController.getById(req, params);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return unitsController.update(req, params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return unitsController.delete(req, params);
}