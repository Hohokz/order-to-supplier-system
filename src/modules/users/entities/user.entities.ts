import type { QueryResultRow } from 'pg';

export const USER_ROLES = ['APPROVER', 'OBSERVER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User extends QueryResultRow {
  id: string;
  username: string;
  password_hash: string;
  line_id: string;
  name: string;
  user_role: UserRole;
  company_name: string;
  created_date: Date;
  updated_date: Date;
  lasted_login_date: Date;
}

export type SafeUser = Omit<User, 'password_hash'>;

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    user_role: user.user_role,
    company_name: user.company_name,
    line_id: user.line_id,
    created_date: user.created_date,
    updated_date: user.updated_date,
    lasted_login_date: user.lasted_login_date,
  };
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}