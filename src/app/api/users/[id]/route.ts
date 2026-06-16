import { NextRequest, NextResponse } from 'next/server';
import { usersController } from '@/modules/users/user.controller';
export { openapiList } from '@/modules/users/user.openapi';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  return usersController.getById(req, { id });
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  return usersController.delete(req, { id });
}