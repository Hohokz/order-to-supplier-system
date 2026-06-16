import { NextRequest } from 'next/server';
import { unitsController } from '@/modules/units/unit.controller';
export { openapiList } from '@/modules/units/unit.openapi';

export async function GET(req: NextRequest) {
  return unitsController.list(req);
}

export async function POST(req: NextRequest) {
  return unitsController.create(req);
}