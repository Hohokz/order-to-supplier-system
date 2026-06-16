import { query } from '@/lib/db';
import type { Units } from './entities/unit.entities'; // ปรับ Path ให้ตรงกับโปรเจกต์ของคุณ
import type { CreateUnitPayload, UpdateUnitPayload } from './dto/input-unit.dto'; // ปรับ Path ให้ตรงกับโปรเจกต์ของคุณ

export const unitRepository = {
  async findById(id: string): Promise<Units | null> {
    const { rows } = await query<Units>(`SELECT * FROM units WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async findAll(page: number, limit: number): Promise<{ data: Units[]; total: number }> {
    const offset = (page - 1) * limit;

    const dataResult = await query<Units>(
      `SELECT * FROM units ORDER BY created_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM units`
    );

    return {
      data: dataResult.rows,
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  },

  async create(data: CreateUnitPayload): Promise<Units> {
    const now = new Date();
    const { rows } = await query<Units>(
      `INSERT INTO units (id, unit_name, created_by, created_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.unit, data.unit_name, data.createdBy, now]
    );
    return rows[0];
  },

  async update(id: string, data: UpdateUnitPayload): Promise<Units | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const mapping: Record<string, string> = {
      unit_name: 'unit_name'
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && mapping[key]) {
        fields.push(`${mapping[key]} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await query<Units>(
      `UPDATE units SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM units WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }
};