import type { QueryResultRow } from 'pg';

export interface RefreshToken extends QueryResultRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  created_date: Date;
}