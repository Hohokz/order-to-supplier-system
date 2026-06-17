import { query } from '@/lib/db';
import { Supplier } from './entities/supplier.entities';
import { CreateSupplierPayload, UpdateSupplierPayload } from './dto/input-supplier.dto';

export const supplierRepository = {
  async findById(id: string): Promise<Supplier | null> {
    const { rows } = await query<Supplier>(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async findAll(page: number, limit: number, filters?: { supplierName?: string }) {
    const offset = (page - 1) * limit;
    const filterClauses: string[] = [];
    const filterParams: (string | number)[] = [];

    // สร้างเงื่อนไขการค้นหาตามชื่อ Supplier
    if (filters?.supplierName) {
      filterClauses.push(`supplier_name LIKE $${filterParams.length + 1}`);
      filterParams.push(`${filters.supplierName}%`);
    }

    const whereSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

    // SQL สำหรับดึงข้อมูล
    const dataSql = `
    SELECT * FROM suppliers 
    ${whereSql} 
    ORDER BY supplier_name ASC 
    LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}
  `;

    // รวม parameters สำหรับ dataSql: [filterParams..., limit, offset]
    const dataParams = [...filterParams, limit, offset];

    // SQL สำหรับนับจำนวน
    const countSql = `SELECT COUNT(*) as count FROM suppliers ${whereSql}`;

    // รัน Query พร้อมกัน
    const [dataResult, countResult] = await Promise.all([
      query<Supplier>(dataSql, dataParams),
      query<{ count: string }>(countSql, filterParams)
    ]);

    return {
      data: dataResult.rows,
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  },

  async existById(id: string): Promise<boolean> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM suppliers WHERE id = $1`,
      [id]
    );
    const count = parseInt(rows[0]?.count ?? '0', 10);
    return count > 0;
  },

  async create(data: CreateSupplierPayload): Promise<Supplier> {
    const now = new Date();
    const { rows } = await query<Supplier>(
      `INSERT INTO suppliers (supplier_name, contract_person, phone, email, address, tax_id, status, created_by, created_date, delivery_when)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [data.supplier_name, data.contract_person, data.phone, data.email, data.address, data.tax_id, data.status ?? 'ACTIVE', data.createdBy, now, data.delivery_when]
    );
    return rows[0];
  },

  async update(id: string, data: UpdateSupplierPayload): Promise<Supplier | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Mapping object keys to column names
    const mapping: Record<string, string> = {
      supplier_name: 'supplier_name',
      contract_person: 'contract_person',
      phone: 'phone',
      email: 'email',
      address: 'address',
      tax_id: 'tax_id',
      status: 'status',
      updatedBy: 'updated_by'
    };

    // Build dynamic query
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && mapping[key]) {
        fields.push(`${mapping[key]} = $${paramIndex++}`);
        values.push(value);
      }
    }

    // Add updated_date
    fields.push(`updated_date = $${paramIndex++}`);
    values.push(new Date());

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await query<Supplier>(
      `UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM suppliers WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }
};