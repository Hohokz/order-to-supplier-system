import { query } from '@/lib/db';
import { User, UserRole } from './entities/user.entities';

interface CreateUserInput {
  username: string;
  passwordHash: string;
  name: string;
  lineId: string;
  userRole: UserRole;
  createdDate?: Date;
  updatedDate?: Date;
  lastedLoginDate?: Date;
}

interface UpdateProfileInput {
  name?: string;
  username?: string;
  lineId?: string;
}

export const userRepository = {
async findByUsername(username: string): Promise<User | null> {
    const { rows } = await query<User>(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const { rows } = await query<User>(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    console.log('findById result', { id, user: rows[0] }); // Debug log to verify query result
    return rows[0] ?? null;
  },

    async findAll(page: number, limit: number): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    const [usersResult, countResult] = await Promise.all([
      query<User>(
        `SELECT * FROM users ORDER BY created_date DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query<{ count: string }>(`SELECT COUNT(*) FROM users`),
    ]);

    return {
      users: usersResult.rows,
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  },

  async create(data: CreateUserInput): Promise<User> {
    const now = new Date();
    const { rows } = await query<User>(
      `INSERT INTO users (username, password_hash, name, user_role, line_id, created_date, updated_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.username, data.passwordHash, data.name, data.userRole, data.lineId, now, now]
    );

    const user = rows[0];
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  },
  
  async updateProfile(id: string, data: UpdateProfileInput): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.username !== undefined) {
      fields.push(`username = $${paramIndex++}`);
      values.push(data.username);
    }
    if(data.lineId !== undefined){
      fields.push(`line_id = $${paramIndex++}`);
      values.push(data.lineId);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }
    console.log('Updating user profile', { id, data, fields, values }); // Debug log to verify update data
    values.push(id);

    const { rows } = await query<User>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return rows[0] ?? null;
  },

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      id,
    ]);
  },

  async updateRole(id: string, role: UserRole): Promise<User | null> {
    const { rows } = await query<User>(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING *`,
      [role, id]
    );
    return rows[0] ?? null;
  },

  async updateLastedLoginDate(id: string, date: Date): Promise<void> {
    await query(`UPDATE users SET lasted_login_date = $1 WHERE id = $2`, [
      date,
      id,
    ]);
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM users WHERE id = $1`, [id]);
    return rowCount > 0;
  },
};

