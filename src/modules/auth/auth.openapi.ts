import { loginSchema } from '../auth/dto/login.dto';

export const openapiList = [
  {
    path: '/api/auth/refresh',
    method: 'post',
    tags: ['Authen'],
    summary: 'Refresh access token',
  },
  {
    path: '/api/auth/logout',
    method: 'post',
    tags: ['Authen'],
    summary: 'Logout',
  },
  {
    path: '/api/auth/login',
    method: 'post',
    tags: ['Authen'],
    summary: 'Login',
    requestBody: loginSchema
  }
];