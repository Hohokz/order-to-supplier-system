import { NextRequest, NextResponse } from 'next/server';
import { authController } from '@/modules/auth/auth.controller';
export { openapiList } from '@/modules/auth/auth.openapi';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return authController.refresh(req);
}