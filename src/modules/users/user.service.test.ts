// src/modules/users/users.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { usersService } from './user.service';
import { userRepository } from './user.repository';
import { authRepository } from '../auth/auth.repository';
import {
    UserNotFoundError,
    UsernameAlreadyExistsError,
    IncorrectPasswordError,
    CannotModifySelfRoleError,
} from './user.error';
import type { User } from './entities/user.entities';

vi.mock('./user.repository', () => ({
    userRepository: {
        findById: vi.fn(),
        findByUsername: vi.fn(),
        findAll: vi.fn(),
        create: vi.fn(),
        updateProfile: vi.fn(),
        updatePasswordHash: vi.fn(),
        updateRole: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../auth/auth.repository', () => ({
    authRepository: {
        revokeAllUserTokens: vi.fn(),
    },
}));

vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));

const SALT_ROUNDS = 10;

function createMockUser(overrides: Partial<User> = {}): User {
    const now = new Date();

    return {
        id: 'user-1',
        username: 'testuser',
        password_hash: 'old-hash',
        name: 'Test User',
        user_role: 'OBSERVER',
        line_id: 'line-default',
        created_date: now,
        updated_date: now,
        lasted_login_date: now,
        ...overrides,
    };
}

describe('usersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns SafeUser when user exists', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(createMockUser());

      const result = await usersService.getProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.username).toBe('testuser');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('throws UserNotFoundError when user does not exist', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(usersService.getProfile('missing')).rejects.toThrow(
        UserNotFoundError
      );
    });
  });

  describe('createUser', () => {
    it('hashes the password and creates a user, returning SafeUser', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      vi.mocked(userRepository.create).mockResolvedValue(createMockUser());

      const result = await usersService.createUser({
        username: 'testuser',
        password_hash: 'PlainPassword123',
        name: 'Test User',
        line_id: 'line-123',
        user_role: 'OBSERVER',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('PlainPassword123', SALT_ROUNDS);
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'testuser',
        passwordHash: 'hashed-password',
        name: 'Test User',
        lineId: 'line-123',
        userRole: 'OBSERVER',
      });
      expect(result).not.toHaveProperty('password_hash');
    });

    it('throws UsernameAlreadyExistsError when username is taken', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValue(createMockUser());

      await expect(
        usersService.createUser({
          username: 'testuser',
          password_hash: 'PlainPassword123',
          name: 'Test User',
          line_id: 'line-123',
          user_role: 'OBSERVER',
        })
      ).rejects.toThrow(UsernameAlreadyExistsError);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('updates fields successfully', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(userRepository.updateProfile).mockResolvedValue(
        createMockUser({ name: 'New Name' })
      );

      const result = await usersService.updateProfile('user-1', {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
    });

    it('throws UsernameAlreadyExistsError when username belongs to another user', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValue(
        createMockUser({ id: 'other-user' })
      );

      await expect(
        usersService.updateProfile('user-1', { username: 'taken' })
      ).rejects.toThrow(UsernameAlreadyExistsError);

      expect(userRepository.updateProfile).not.toHaveBeenCalled();
    });

    it('allows updating username to the same value (no conflict with self)', async () => {
      const existingUser = createMockUser();
      vi.mocked(userRepository.findByUsername).mockResolvedValue(existingUser);
      vi.mocked(userRepository.updateProfile).mockResolvedValue(existingUser);

      const result = await usersService.updateProfile('user-1', {
        username: 'testuser',
      });

      expect(result.id).toBe('user-1');
    });

    it('throws UserNotFoundError when target user does not exist', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(userRepository.updateProfile).mockResolvedValue(null);

      await expect(
        usersService.updateProfile('missing', { name: 'New Name' })
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('changePassword', () => {
    it('updates password and revokes all tokens on success', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(createMockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);

      await usersService.changePassword('user-1', {
        currentPassword: 'old-pass',
        newPassword: 'new-pass-123',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('old-pass', 'old-hash');
      expect(bcrypt.hash).toHaveBeenCalledWith('new-pass-123', SALT_ROUNDS);
      expect(userRepository.updatePasswordHash).toHaveBeenCalledWith(
        'user-1',
        'new-hash'
      );
      expect(authRepository.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('throws IncorrectPasswordError when current password is wrong', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(createMockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        usersService.changePassword('user-1', {
          currentPassword: 'wrong',
          newPassword: 'new-pass-123',
        })
      ).rejects.toThrow(IncorrectPasswordError);

      expect(userRepository.updatePasswordHash).not.toHaveBeenCalled();
      expect(authRepository.revokeAllUserTokens).not.toHaveBeenCalled();
    });

    it('throws UserNotFoundError when user does not exist', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(
        usersService.changePassword('missing', {
          currentPassword: 'old',
          newPassword: 'new-pass-123',
        })
      ).rejects.toThrow(UserNotFoundError);

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    it('updates role and revokes tokens for the target user', async () => {
      vi.mocked(userRepository.updateRole).mockResolvedValue(
        createMockUser({ user_role: 'APPROVER' })
      );

      const result = await usersService.updateRole('user-1', 'APPROVER', 'admin-1');

      expect(result.user_role).toBe('APPROVER');
      expect(userRepository.updateRole).toHaveBeenCalledWith('user-1', 'APPROVER');
      expect(authRepository.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('throws CannotModifySelfRoleError when changing own role', async () => {
      await expect(
        usersService.updateRole('admin-1', 'OBSERVER', 'admin-1')
      ).rejects.toThrow(CannotModifySelfRoleError);

      expect(userRepository.updateRole).not.toHaveBeenCalled();
      expect(authRepository.revokeAllUserTokens).not.toHaveBeenCalled();
    });

    it('throws UserNotFoundError when target user does not exist', async () => {
      vi.mocked(userRepository.updateRole).mockResolvedValue(null);

      await expect(
        usersService.updateRole('missing-user', 'APPROVER', 'admin-1')
      ).rejects.toThrow(UserNotFoundError);

      expect(authRepository.revokeAllUserTokens).not.toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('returns paginated SafeUser list', async () => {
      vi.mocked(userRepository.findAll).mockResolvedValue({
        users: [createMockUser()],
        total: 1,
      });

      const result = await usersService.listUsers(1, 20);

      expect(userRepository.findAll).toHaveBeenCalledWith(1, 20);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.users).toHaveLength(1);
      expect(result.users[0]).not.toHaveProperty('password_hash');
    });

    it('returns an empty list when there are no users', async () => {
      vi.mocked(userRepository.findAll).mockResolvedValue({
        users: [],
        total: 0,
      });

      const result = await usersService.listUsers(1, 20);

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('deleteUser', () => {
    it('deletes the target user', async () => {
      vi.mocked(userRepository.delete).mockResolvedValue(true);

      await usersService.deleteUser('user-1', 'admin-1');

      expect(userRepository.delete).toHaveBeenCalledWith('user-1');
    });

    it('throws CannotModifySelfRoleError when deleting self', async () => {
      await expect(usersService.deleteUser('admin-1', 'admin-1')).rejects.toThrow(
        CannotModifySelfRoleError
      );

      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it('throws UserNotFoundError when target does not exist', async () => {
      vi.mocked(userRepository.delete).mockResolvedValue(false);

      await expect(usersService.deleteUser('missing', 'admin-1')).rejects.toThrow(
        UserNotFoundError
      );
    });
  });
});