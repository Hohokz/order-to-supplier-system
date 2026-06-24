// scripts/reset-admin.ts
import bcrypt from 'bcrypt';
import { pool } from '../src/lib/db';

async function resetAdmin() {
  const username = 'admin';
  const password = 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username`,
    [passwordHash, username]
  );

  if (result.rows.length === 0) {
    console.log('Admin user not found. Seeding new admin...');
    const name = 'System Admin';
    const lineId = 'admin-line-id';
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, name, user_role, line_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, user_role`,
      [username, passwordHash, name, 'APPROVER', lineId]
    );
    console.log('Admin user created:', rows[0]);
  } else {
    console.log('Admin password reset successfully:', result.rows[0]);
  }

  await pool.end();
}

resetAdmin().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
