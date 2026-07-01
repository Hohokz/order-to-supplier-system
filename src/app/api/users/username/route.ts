import { NextRequest, NextResponse } from 'next/server';
import { usersController } from '@/modules/users/user.controller';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ username: string }>;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { username } = await params;
  return usersController.getByUsername(req, { username });
}