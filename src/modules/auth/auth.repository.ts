import { query } from '@/lib/db';
import { RefreshToken } from './entities/refresh-token.entity';

export const authRepository = {
  async storeRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  },

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    const { rows } = await query<RefreshToken>(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND revoked = false AND expires_at > now()`,
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`,
      [tokenHash]
    );
  },

  async revokeAllUserTokens(userId: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`,
      [userId]
    );
  },
};