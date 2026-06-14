import { NextRequest, NextResponse } from 'next/server';
import { usersController } from '@/modules/users/user.controller';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  return usersController.updateRole(req, { id });
}