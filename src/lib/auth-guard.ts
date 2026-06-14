// src/lib/middleware/auth-guard.ts
import { NextRequest } from 'next/server';
import {
  verifyAccessToken,
  AccessTokenPayload,
  TokenExpiredError,
  InvalidTokenError,
} from '@/lib/jwt';
import type { UserRole } from '../modules/users/entities/users.entities';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

const AUTH_HEADER = 'authorization';
const BEARER_PREFIX = 'Bearer ';

function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get(AUTH_HEADER);
  if (!header?.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies the request's access token and returns the decoded payload.
 * Throws `UnauthorizedError` if the token is missing, invalid, or expired.
 */
export function requireAuth(req: NextRequest): AccessTokenPayload {
  const token = extractBearerToken(req);

  if (!token) {
    throw new UnauthorizedError('Missing access token');
  }

  try {
    return verifyAccessToken(token);
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new UnauthorizedError('Access token expired');
    }
    if (err instanceof InvalidTokenError) {
      throw new UnauthorizedError('Invalid access token');
    }
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

/**
 * Asserts that the authenticated user has one of the allowed roles.
 * Throws `ForbiddenError` if the user's role is not included.
 *
 * @param user   The decoded access token payload (from `requireAuth`)
 * @param roles  One or more roles permitted to perform the action
 */
export function requireRole(
  user: AccessTokenPayload,
  ...roles: readonly UserRole[]
): void {
  if (roles.length === 0) {
    throw new Error('requireRole called with no roles specified');
  }

  if (!roles.includes(user.role)) {
    throw new ForbiddenError(
      `Requires one of the following roles: ${roles.join(', ')}`
    );
  }
}