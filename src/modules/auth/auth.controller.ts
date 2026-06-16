import { NextRequest, NextResponse } from 'next/server';
import { authService } from './auth.service';
import { usersService } from '../users/user.service';
import { loginSchema } from './dto/login.dto';
import { InvalidRefreshTokenError, UserNotFoundError } from './auth.error';
import { handleError } from '../../lib/error-handler';

const REFRESH_COOKIE = 'refreshToken';
const isProd = process.env.NODE_ENV === 'production';

function setRefreshCookie(res: NextResponse, token: string): void {
  res.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60,
  });
}

function clearRefreshCookie(res: NextResponse): void {
  res.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 0,
  });
}

export const authController = {
  async login(req: NextRequest) {
    try {
      const body = loginSchema.parse(await req.json());
      const { user, accessToken, refreshToken } = await authService.login(body);
      const res = NextResponse.json({ user, accessToken });
      setRefreshCookie(res, refreshToken);
      await usersService.updateLastedLoginDate(user.id);
      return res;
    } catch (err) {
      return handleError(err);
    }
  },

  async refresh(req: NextRequest) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    try {
      const { accessToken, refreshToken: newRefreshToken } =
        await authService.refresh(refreshToken);

      const res = NextResponse.json({ accessToken });
      setRefreshCookie(res, newRefreshToken);
      return res;
    } catch (err) {
      const res = NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
      clearRefreshCookie(res);

      if (
        !(err instanceof InvalidRefreshTokenError) &&
        !(err instanceof UserNotFoundError)
      ) {
        console.error('Unexpected error during token refresh', err);
      }

      return res;
    }
  },

  async logout(req: NextRequest) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch (err) {
        console.error('Error revoking refresh token on logout', err);
      }
    }

    const res = NextResponse.json({ success: true });
    clearRefreshCookie(res);
    return res;
  },
};