import { query } from './src/lib/db';

async function check() {
  try {
    const res = await query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['units']);
    console.log(res.rows.map(r => r.column_name));
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

check();
