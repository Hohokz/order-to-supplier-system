import { NextRequest, NextResponse } from 'next/server';
import { authController } from '@/modules/auth/auth.controller';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return authController.refresh(req);
}