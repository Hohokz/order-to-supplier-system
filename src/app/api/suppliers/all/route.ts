import { NextRequest, NextResponse } from 'next/server';
import { suppliersController } from '@/modules/suppliers/supplier.controller';
export { openapiList } from '@/modules/suppliers/supplier.openapi';


export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest): Promise<NextResponse> {
  return suppliersController.list(req);
}