import { createProfileSchema } from '@/modules/users/dto/create-user.dto';
import { changePasswordSchema } from './dto/change-password.dto';
import { updateProfileSchema } from './dto/update-profile.dto';
import { updateRoleSchema } from './dto/update-user-role.dto';
export const openapiList = [
  {
    method: 'get',
    path: '/api/users/me',
    tags: ['Users'],
    summary: 'Get current user info',
  },
  {
    method: 'patch',
    path: '/api/users/me',
    tags: ['Users'],
    summary: 'Update current user',
    requestBody: createProfileSchema
  },
  {
    path: '/api/users/[id]/role',
    method: 'patch',
    tags: ['Users'],
    summary: 'Update user role',
    requestBody: changePasswordSchema
  },
  {
    method: 'get',
    path: '/api/users/me',
    tags: ['Users'],
    summary: 'Get current user info',
  },
  {
    method: 'patch',
    path: '/api/users/me',
    tags: ['Users'],
    summary: 'Update current user',
    requestBody: updateProfileSchema
  },
  {
    method: 'get',
    path: '/api/users/[id]',
    tags: ['Users'],
    summary: 'Get user by ID',
  },
  {
    method: 'delete',
    path: '/api/users/[id]',
    tags: ['Users'],
    summary: 'Delete user',
  },
  {
    path: '/api/users/[id]/role',
    method: 'patch',
    tags: ['Users'],
    summary: 'Update user role',
    requestBody: updateRoleSchema
  }
];