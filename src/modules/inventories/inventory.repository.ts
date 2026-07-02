import { query, pool } from '@/lib/db';
import type { PoolClient } from 'pg';
import type { Inventory } from './entities/inventory.entities';
import type { CreateInventoryPayload, UpdateInventoryPayload } from './dto/input-inventory.dto';

export const inventoryRepository = {
  async findById(id: string): Promise<Inventory | null> {
    const sql = `
    SELECT i.*, 
           json_build_object('id', s.id, 'supplier_name', s.supplier_name) as supplier,
           json_build_object('id', u.id, 'unit_name', u.unit_name) as unit
    FROM inventories i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN units u ON i.unit_id = u.id
    WHERE i.id = $1
  `;

    const { rows } = await query<Inventory>(sql, [id]);

    return rows[0] ?? null;
  },

  async findAll(page: number, limit: number, filters?: { inventoryName?: string; supplierName?: string; status?: string }) {
    const offset = (page - 1) * limit;
    const filterClauses: string[] = [];
    const filterParams: (string | number)[] = [];

    // สร้างเงื่อนไขการค้นหา
    if (filters?.inventoryName) {
      filterClauses.push(`i.inventory_name LIKE $${filterParams.length + 1}`);
      filterParams.push(`${filters.inventoryName}%`);
    }

    if (filters?.supplierName) {
      filterClauses.push(`s.supplier_name LIKE $${filterParams.length + 1}`);
      filterParams.push(`${filters.supplierName}%`);
    }

    if (filters?.status) {
      filterClauses.push(`i.status = $${filterParams.length + 1}`);
      filterParams.push(`${filters.status}`);
    }

    const whereSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

    const dataSql = `
    SELECT i.*, 
           json_build_object('id', s.id, 'supplier_name', s.supplier_name) as supplier,
           json_build_object('id', u.id, 'unit_name', u.unit_name) as unit
    FROM inventories i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN units u ON i.unit_id = u.id
    ${whereSql}
    ORDER BY i.seq ASC
    LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}
  `;

    const dataParams = [...filterParams, limit, offset];

    const countSql = `
    SELECT COUNT(*) as count 
    FROM inventories i 
    LEFT JOIN suppliers s ON i.supplier_id = s.id 
    ${whereSql}
  `;

    // รัน Query พร้อมกัน
    const [dataResult, countResult] = await Promise.all([
      query<Inventory>(dataSql, dataParams),
      query<{ count: string }>(countSql, filterParams)
    ]);

    return {
      data: dataResult.rows,
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  },

  async masterInventories() {
    const sql = `
      SELECT i.*, 
             json_build_object('id', s.id, 'supplier_name', s.supplier_name) as supplier,
             json_build_object('id', u.id, 'unit_name', u.unit_name) as unit
      FROM inventories i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN units u ON i.unit_id = u.id
      WHERE i.status = 'ACTIVE'
      ORDER BY i.seq ASC;
    `;

    // ปรับการรับค่าให้ตรงกับรูปแบบที่ service ใช้งาน
    const { rows } = await query<Inventory>(sql);
    console.log(rows);
    return rows;
  },

  async existWithUnit(id: string) {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM inventories WHERE unit_id = $1`,
      [id]
    );
    const count = parseInt(rows[0]?.count ?? '0', 10);
    return count > 0;
  },

  async existWithSupplier(id: string) {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM inventories WHERE supplier_id = $1`,
      [id]
    );
    const count = parseInt(rows[0]?.count ?? '0', 10);
    return count > 0;
  },

  async existWithInventoryName(name: string) {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM inventories WHERE inventory_name = $1`,
      [name]
    );
    const count = parseInt(rows[0]?.count ?? '0', 10);
    return count > 0;
  },

  async getNextSeq(supplier_id: string, client: PoolClient): Promise<number> {
    const { rows } = await client.query<{ next_seq: number }>(
      `SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq
     FROM (
       SELECT seq FROM inventories WHERE supplier_id = $1 FOR UPDATE
     ) locked_rows`,
      [supplier_id]
    );
    return rows[0].next_seq;
  },

  async create(data: CreateInventoryPayload): Promise<Inventory> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const nextSeq = await this.getNextSeq(data.supplier_id, client);
      const now = new Date();

      const sql = `
      WITH inserted AS (
        INSERT INTO inventories (
          seq, inventory_name, inventory_quantity, unit_price, status,
          supplier_id, unit_id, created_by, created_date, safety_quantity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      )
      SELECT i.*,
             json_build_object('id', s.id, 'supplier_name', s.supplier_name) as supplier,
             json_build_object('id', u.id, 'unit_name', u.unit_name) as unit
      FROM inserted i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN units u ON i.unit_id = u.id
    `;

      const { rows } = await client.query<Inventory>(sql, [
        nextSeq,
        data.inventory_name,
        data.inventory_quantity,
        data.unit_price,
        data.status ?? 'ACTIVE',
        data.supplier_id,
        data.unit_id,
        data.createdBy,
        now,
        data.safety_quantity
      ]);

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id: string, data: UpdateInventoryPayload): Promise<Inventory | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const mapping: Record<string, string> = {
      inventory_name: 'inventory_name',
      inventory_quantity: 'inventory_quantity',
      unit_price: 'unit_price',
      status: 'status',
      supplier_id: 'supplier_id',
      unit_id: 'unit_id',
      safety_quantity: 'safety_quantity',
      updatedBy: 'updated_by'
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && mapping[key]) {
        fields.push(`${mapping[key]} = $${paramIndex++}`);
        values.push(value);
      }
    }

    fields.push(`updated_date = $${paramIndex++}`);
    values.push(new Date());

    if (fields.length === 1) return this.findById(id);

    values.push(id);

    // ใช้ CTE เพื่อทำ UPDATE แล้ว JOIN ข้อมูลใหม่กลับมาทันที
    const sql = `
    WITH updated AS (
      UPDATE inventories 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    )
    SELECT i.*, 
           json_build_object('id', s.id, 'supplier_name', s.supplier_name) as supplier,
           json_build_object('id', u.id, 'unit_name', u.unit_name) as unit
    FROM updated i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN units u ON i.unit_id = u.id
  `;

    const { rows } = await query<Inventory>(sql, values);
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const itemToDelete = await this.findById(id);
    if (!itemToDelete) return false;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM inventories WHERE id = $1', [id]);

      await client.query(
        `UPDATE inventories 
       SET seq = seq - 1 
       WHERE supplier_id = $1 AND seq > $2`,
        [itemToDelete.supplier_id, itemToDelete.seq]
      );

      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};