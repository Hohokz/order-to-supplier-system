import { NextRequest, NextResponse } from 'next/server';
import { usersController } from '@/modules/users/user.controller';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return usersController.list(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return usersController.create(req);
}