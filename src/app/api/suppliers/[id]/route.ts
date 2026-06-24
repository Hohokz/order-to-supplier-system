import { NextRequest, NextResponse } from 'next/server';
import { suppliersController } from '@/modules/suppliers/supplier.controller';
export { openapiList } from '@/modules/suppliers/supplier.openapi';

export const dynamic = 'force-dynamic';

// รับ params จาก Next.js App Router
type Params = { id: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  return suppliersController.getById(req, resolvedParams);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  return suppliersController.update(req, resolvedParams);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  return suppliersController.delete(req, resolvedParams);
}