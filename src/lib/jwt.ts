import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'APPROVER' | 'OBSERVER';
}

export interface RefreshTokenPayload {
  sub: string;
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const ACCESS_SECRET: Secret = getEnv('JWT_ACCESS_SECRET');
const REFRESH_SECRET: Secret = getEnv('JWT_REFRESH_SECRET');

const ACCESS_EXPIRES: SignOptions['expiresIn'] =
  (process.env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn']) ?? '15m';

const REFRESH_EXPIRES: SignOptions['expiresIn'] =
  (process.env.JWT_REFRESH_EXPIRES as SignOptions['expiresIn']) ?? '7d';

export class TokenExpiredError extends Error {
  constructor(message = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sub === 'string' &&
    typeof v.email === 'string' &&
    (v.role === 'APPROVER' || v.role === 'OBSERVER')
  );
}

function isRefreshTokenPayload(value: unknown): value is RefreshTokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.sub === 'string';
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    if (!isAccessTokenPayload(decoded)) {
      throw new InvalidTokenError('Access token payload malformed');
    }
    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    if (err instanceof InvalidTokenError) {
      throw err;
    }
    throw new InvalidTokenError();
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    if (!isRefreshTokenPayload(decoded)) {
      throw new InvalidTokenError('Refresh token payload malformed');
    }
    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    if (err instanceof InvalidTokenError) {
      throw err;
    }
    throw new InvalidTokenError();
  }
}