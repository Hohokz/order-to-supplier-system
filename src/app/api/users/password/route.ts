import { NextRequest, NextResponse } from 'next/server';
import { usersController } from '@/modules/users/user.controller';
export { openapiList } from '@/modules/users/user.openapi';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  return usersController.changePassword(req);
}