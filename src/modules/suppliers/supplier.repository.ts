import { query } from '@/lib/db';
import { Supplier } from './entities/supplier.entities';
import { CreateSupplierPayload, UpdateSupplierPayload } from './dto/input-supplier.dto';

export const supplierRepository = {
  async findById(id: string): Promise<Supplier | null> {
    const { rows } = await query<Supplier>(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async findAll(page: number, limit: number): Promise<{ data: Supplier[]; total: number }> {
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      query<Supplier>(`SELECT * FROM suppliers ORDER BY created_date DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      query<{ count: string }>(`SELECT COUNT(*) FROM suppliers`),
    ]);

    return {
      data: dataResult.rows,
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  },

  async create(data: CreateSupplierPayload): Promise<Supplier> {
    const now = new Date();
    const { rows } = await query<Supplier>(
      `INSERT INTO suppliers (supplier_name, contract_person, phone, email, address, tax_id, status, created_by, created_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [data.supplier_name, data.contract_person, data.phone, data.email, data.address, data.tax_id, data.status ?? 'ACTIVE', data.createdBy, now]
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