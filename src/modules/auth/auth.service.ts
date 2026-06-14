import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authRepository } from './auth.repository';
import { userRepository } from '../users/user.repository';
import { LoginDto } from './dto/login.dto';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  InvalidTokenError,
  TokenExpiredError,
} from '@/lib/jwt';
import { toSafeUser, SafeUser, UserRole, isUserRole } from '../users/entities/users.entities';
import {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  UserNotFoundError,
} from './auth.error';

const REFRESH_TOKEN_TTL_DAYS = 7;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginResult extends AuthTokens {
  user: SafeUser;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshExpiryDate(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function issueTokenPair(user: {
  id: string;
  username: string;
  role: UserRole;
}): Promise<AuthTokens> {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.username,
    role: user.role,
  });
  const refreshToken = signRefreshToken({ sub: user.id });

  await authRepository.storeRefreshToken(
    user.id,
    hashToken(refreshToken),
    getRefreshExpiryDate()
  );

  return { accessToken, refreshToken };
}

export const authService = {

  async login(data: LoginDto): Promise<LoginResult> {
    const user = await userRepository.findByUsername(data.username);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const isValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    const userRoleNum = isUserRole(user.user_role) ? user.user_role : 'OBSERVER';
    const tokenPairUser = { id: user.id, username: user.username, role: userRoleNum };

    const tokens = await issueTokenPair(tokenPairUser);

    return {
      user: toSafeUser(user),
      ...tokens,
    };
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      if (err instanceof TokenExpiredError || err instanceof InvalidTokenError) {
        throw new InvalidRefreshTokenError();
      }
      throw err;
    }

    const tokenHash = hashToken(refreshToken);

    const stored = await authRepository.findRefreshToken(tokenHash);
    if (!stored) {
      throw new InvalidRefreshTokenError();
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Rotate refresh token: revoke the old one before issuing a new pair.
    await authRepository.revokeRefreshToken(tokenHash);

    const userRoleNum = isUserRole(user.user_role) ? user.user_role : 'OBSERVER';
    const tokenPairUser = { id: user.id, username: user.username, role: userRoleNum };

    return await issueTokenPair(tokenPairUser);
  },

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await authRepository.revokeRefreshToken(tokenHash);
  },

  async logoutAll(userId: string): Promise<void> {
    await authRepository.revokeAllUserTokens(userId);
  },
};