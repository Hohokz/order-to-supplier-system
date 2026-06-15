import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { authService } from './auth.service';
import { authRepository } from './auth.repository';
import { userRepository } from '../users/user.repository';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  InvalidTokenError,
  TokenExpiredError,
} from '@/lib/jwt';
import {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  UserNotFoundError,
} from './auth.error';
import type { User ,UserRole } from '../users/entities/users.entities';

vi.mock('./auth.repository', () => ({
  authRepository: {
    storeRefreshToken: vi.fn(),
    findRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeAllUserTokens: vi.fn(),
  },
}));

vi.mock('../users/user.repository', () => ({
  userRepository: {
    findByUsername: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('@/lib/jwt', () => ({
  signAccessToken: vi.fn(() => 'mock-access-token'),
  signRefreshToken: vi.fn(() => 'mock-refresh-token'),
  verifyRefreshToken: vi.fn(),
  TokenExpiredError: class TokenExpiredError extends Error {
    constructor(message = 'Token has expired') {
      super(message);
      this.name = 'TokenExpiredError';
    }
  },
  InvalidTokenError: class InvalidTokenError extends Error {
    constructor(message = 'Invalid token') {
      super(message);
      this.name = 'InvalidTokenError';
    }
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    username: 'testuser',
    password_hash: 'hashed-password',
    name: 'Test User',
    user_role: 'OBSERVER',
    line_id: null,
    created_date: new Date(),
    updated_date: new Date(),
    lasted_login_date: new Date(),
    ...overrides,
  } as User;
}

function createMockRefreshTokenRecord(
  overrides: Partial<{
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    revoked: boolean;
    created_date: Date;
  }> = {}
) {
  return {
    id: 'rt-1',
    user_id: 'user-1',
    token_hash: 'hash',
    expires_at: new Date(Date.now() + 1_000_000),
    revoked: false,
    created_date: new Date(),
    ...overrides,
  };
}

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('returns user, accessToken, and refreshToken on valid credentials', async () => {
      const mockUser = createMockUser();
      vi.mocked(userRepository.findByUsername).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await authService.login({
        username: 'testuser',
        password: 'Password123',
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user.username).toBe('testuser');
      expect(result.user).not.toHaveProperty('password_hash');

      expect(signAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', email: 'testuser', role: 'OBSERVER' })
      );
      expect(signRefreshToken).toHaveBeenCalledWith({ sub: 'user-1' });
      expect(authRepository.storeRefreshToken).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(Date)
      );
    });

    it('throws InvalidCredentialsError when username does not exist', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValue(null);

      await expect(
        authService.login({ username: 'nouser', password: 'x' })
      ).rejects.toThrow(InvalidCredentialsError);

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(authRepository.storeRefreshToken).not.toHaveBeenCalled();
    });

    it('throws InvalidCredentialsError when password is incorrect', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValue(createMockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        authService.login({ username: 'testuser', password: 'wrong' })
      ).rejects.toThrow(InvalidCredentialsError);

      expect(authRepository.storeRefreshToken).not.toHaveBeenCalled();
    });

    it('falls back to OBSERVER role when stored user_role is invalid', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValue(
        createMockUser({ user_role: 'NOT_A_REAL_ROLE' as UserRole })
      );
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await authService.login({ username: 'testuser', password: 'Password123' });

      expect(signAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'OBSERVER' })
      );
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and returns a new token pair', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({ sub: 'user-1' });
      vi.mocked(authRepository.findRefreshToken).mockResolvedValue(
        createMockRefreshTokenRecord()
      );
      vi.mocked(userRepository.findById).mockResolvedValue(createMockUser());

      const result = await authService.refresh('valid-refresh-token');

      expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith(
        expect.any(String)
      );
      expect(authRepository.storeRefreshToken).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(Date)
      );
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('throws InvalidRefreshTokenError when the refresh token is invalid', async () => {
      vi.mocked(verifyRefreshToken).mockImplementation(() => {
        throw new InvalidTokenError();
      });

      await expect(authService.refresh('bad-token')).rejects.toThrow(
        InvalidRefreshTokenError
      );

      expect(authRepository.findRefreshToken).not.toHaveBeenCalled();
    });

    it('throws InvalidRefreshTokenError when the refresh token has expired', async () => {
      vi.mocked(verifyRefreshToken).mockImplementation(() => {
        throw new TokenExpiredError();
      });

      await expect(authService.refresh('expired-token')).rejects.toThrow(
        InvalidRefreshTokenError
      );
    });

    it('throws InvalidRefreshTokenError when stored token is not found (already revoked)', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({ sub: 'user-1' });
      vi.mocked(authRepository.findRefreshToken).mockResolvedValue(null);

      await expect(authService.refresh('revoked-token')).rejects.toThrow(
        InvalidRefreshTokenError
      );

      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('throws UserNotFoundError when the user no longer exists', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({ sub: 'deleted-user' });
      vi.mocked(authRepository.findRefreshToken).mockResolvedValue(
        createMockRefreshTokenRecord({ user_id: 'deleted-user' })
      );
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(authService.refresh('valid-token')).rejects.toThrow(
        UserNotFoundError
      );

      expect(authRepository.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it('propagates unexpected errors from verifyRefreshToken', async () => {
      vi.mocked(verifyRefreshToken).mockImplementation(() => {
        throw new Error('unexpected failure');
      });

      await expect(authService.refresh('weird-token')).rejects.toThrow(
        'unexpected failure'
      );
    });
  });

  describe('logout', () => {
    it('revokes the refresh token by its hash', async () => {
      await authService.logout('some-refresh-token');
      expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith(
        expect.any(String)
      );
    });
  });

  describe('logoutAll', () => {
    it('revokes all tokens for the user', async () => {
      await authService.logoutAll('user-1');
      expect(authRepository.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });
  });
});