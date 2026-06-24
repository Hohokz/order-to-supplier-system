// src/modules/users/users.service.ts
import bcrypt from 'bcrypt';
import { userRepository } from './user.repository';
import { authRepository } from '../auth/auth.repository';
import { toSafeUser, SafeUser, UserRole } from './entities/user.entities';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateProfileDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  UserNotFoundError,
  UsernameAlreadyExistsError,
  IncorrectPasswordError,
  CannotModifySelfRoleError,
} from './user.error';

const SALT_ROUNDS = 10;

interface PaginatedUsers {
  users: SafeUser[];
  total: number;
  page: number;
  limit: number;
}

export const usersService = {
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return toSafeUser(user);
  },

  async getUserById(userId: string): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return toSafeUser(user);
  },

  async createUser(data: CreateProfileDto): Promise<SafeUser> {
    const existing = await userRepository.findByUsername(data.username);
    if (existing) {
      throw new UsernameAlreadyExistsError();
    }

    const passwordHash = await bcrypt.hash(data.password_hash, SALT_ROUNDS);
    const user = await userRepository.create({
      username: data.username,
      passwordHash,
      name: data.name,
      lineId: data.line_id,
      userRole: data.user_role,
      companyName: data.company_name
    });

    return toSafeUser(user);
  },

  async updateProfile(userId: string, data: UpdateProfileDto): Promise<SafeUser> {
    if (data.username) {
      const existing = await userRepository.findByUsername(data.username);
      if (existing && existing.id !== userId) {
        throw new UsernameAlreadyExistsError();
      }
    }

    const updated = await userRepository.updateProfile(userId, data);
    if (!updated) {
      throw new UserNotFoundError();
    }

    return toSafeUser(updated);
  },

  async changePassword(userId: string, data: ChangePasswordDto): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.password_hash);
    if (!isValid) {
      throw new IncorrectPasswordError();
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
    await userRepository.updatePasswordHash(userId, newPasswordHash);

    // Invalidate all sessions so other devices must re-authenticate
    // with the new password.
    await authRepository.revokeAllUserTokens(userId);
  },

  async listUsers(page: number, limit: number): Promise<PaginatedUsers> {
    const { users, total } = await userRepository.findAll(page, limit);
    return {
      users: users.map(toSafeUser),
      total,
      page,
      limit,
    };
  },

  async updateRole(
    targetUserId: string,
    newRole: UserRole,
    requestingUserId: string
  ): Promise<SafeUser> {
    if (targetUserId === requestingUserId) {
      throw new CannotModifySelfRoleError();
    }

    const updated = await userRepository.updateRole(targetUserId, newRole);
    if (!updated) {
      throw new UserNotFoundError();
    }

    await authRepository.revokeAllUserTokens(targetUserId);

    return toSafeUser(updated);
  },

  async updateLastedLoginDate(userId: string): Promise<void> {
    await userRepository.updateLastedLoginDate(userId, new Date());
  },

  async deleteUser(targetUserId: string, requestingUserId: string): Promise<void> {
    if (targetUserId === requestingUserId) {
      throw new CannotModifySelfRoleError(); // reuse: "cannot modify/delete self"
    }

    const deleted = await userRepository.delete(targetUserId);
    if (!deleted) {
      throw new UserNotFoundError();
    }
  },
};