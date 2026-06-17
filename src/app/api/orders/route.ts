import { NextRequest, NextResponse } from 'next/server';
import { orderController } from '@/modules/order/order.controller';
export { openapiList } from '@/modules/suppliers/supplier.openapi';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return orderController.create(req);
}