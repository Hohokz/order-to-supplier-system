// scripts/seed-admin.ts
import bcrypt from 'bcrypt';
import { pool } from '../src/lib/db';

async function seedAdmin() {
  const username = 'admin';
  const password = 'ChangeMe123!';
  const name = 'System Admin';
  const lineId = 'admin-line-id';

  const existing = await pool.query(
    `SELECT id FROM users WHERE username = $1`,
    [username]
  );

  if (existing.rows.length > 0) {
    console.log('Admin user already exists, skipping.');
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (username, password_hash, name, user_role, line_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, user_role`,
    [username, passwordHash, name, 'APPROVER', lineId]
  );

  console.log('Admin user created:', rows[0]);
  console.log(`Login with: username=${username}, password=${password}`);

  await pool.end();
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

//npx tsx --env-file=.env.local scripts/seed-admin.ts