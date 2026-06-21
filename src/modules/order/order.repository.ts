import { pool, query } from '@/lib/db';
import type { Order, OrderWithItems } from './entities/order.entities';
import type { CreateOrderPayload } from './dto/input-order';
import type { ListSuppliersQueryDto } from '../suppliers/dto/list-supplier.dto';

export const orderRepository = {
    async findAll(page: number, limit: number, filters?: { orderDate?: string; approvedBy?: string; signature?: string }) {
        const offset = (page - 1) * limit;
        const filterClauses: string[] = [];
        const filterParams: (string | number)[] = [];

        if (filters?.orderDate) {
            filterClauses.push(`DATE(created_date) = $${filterParams.length + 1}`);
            filterParams.push(filters.orderDate);
        }
        if (filters?.approvedBy) {
            filterClauses.push(`approved_by LIKE $${filterParams.length + 1}`);
            filterParams.push(`${filters.approvedBy}%`);
        }
        if (filters?.signature) {
            filterClauses.push(`signature LIKE $${filterParams.length + 1}`);
            filterParams.push(`${filters.signature}%`);
        }

        const whereSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

        const dataSql = `
                SELECT o.*, 
                        COALESCE(
                        json_agg(
                            json_build_object(
                            'id', oi.id, 
                            'inventory_name', inv.inventory_name,
                            'supplier_name', s.supplier_name,
                            'delivery_when', s.delivery_when,
                            'unit', u.id,
                            'unit_name', u.unit_name,
                            'quantity', oi.quantity, 
                            'order_quantity', oi.order_quantity
                            )
                        ) FILTER (WHERE oi.id IS NOT NULL), '[]'
                        ) as items
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN inventories inv ON oi.inventory_id = inv.id
                LEFT JOIN suppliers s on inv.supplier_id = s.id 
                LEFT JOIN units u on inv.unit_id  = u.id
                ${whereSql}
                GROUP BY o.id
                ORDER BY o.created_date DESC 
                LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}
                `;

        const countSql = `SELECT COUNT(*) as count FROM orders ${whereSql}`;

        const [dataResult, countResult] = await Promise.all([
            query<ListSuppliersQueryDto>(dataSql, [...filterParams, limit, offset]),
            query<{ count: string }>(countSql, filterParams)
        ]);

        

        return { data: dataResult.rows, total: Number(countResult.rows[0]?.count ?? 0) };
    },

    async create(data: CreateOrderPayload & { createdBy: string }): Promise<OrderWithItems> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Insert Order หลักเหมือนเดิม
            const orderSql = `
        WITH inserted AS (
          INSERT INTO orders (signature, created_by, is_approve, created_date)
          VALUES ($1, $2, false, $3)
          RETURNING *
        )
        SELECT * FROM inserted;
      `;
            const orderRes = await client.query<Order>(orderSql, [data.signature, data.createdBy, new Date()]);
            const newOrder = orderRes.rows[0];

            // 2. Insert รายการลูกเหมือนเดิม
            const itemSql = `
        INSERT INTO order_items (order_id, inventory_id, quantity, order_quantity)
        VALUES ($1, $2, $3, $4);
      `;
            for (const item of data.items) {
                await client.query(itemSql, [newOrder.id, item.inventory_id, item.quantity, item.order_quantity]);
            }

            // 3. ⭐️ ปรับตรงนี้! เพิ่ม JOIN ตาราง inventories เพื่อเอา inventory_name มาใส่ด้วย
            const dtoSql = `
        SELECT o.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', oi.id, 
                     'inventory_id', oi.inventory_id, 
                     'inventory_name', inv.inventory_name, -- ดึงชื่อมาใส่ตรงนี้
                     'quantity', oi.quantity, 
                     'order_quantity', oi.order_quantity
                   )
                 ) FILTER (WHERE oi.id IS NOT NULL), '[]'
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN inventories inv ON oi.inventory_id = inv.id -- ⭐️ JOIN ตารางคลังสินค้าเพิ่มตรงนี้
        WHERE o.id = $1
        GROUP BY o.id;
      `;
            const finalRes = await client.query<OrderWithItems>(dtoSql, [newOrder.id]);

            await client.query('COMMIT');
            return finalRes.rows[0];

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async delete(id: number): Promise<boolean> {
        const { rowCount } = await query(`DELETE FROM orders WHERE id = $1`, [id]);
        return (rowCount ?? 0) > 0;
    }
};