import { pool, query } from '@/lib/db';
import { OrderResponseSchema, OrderResponse } from './dto/response/list-order-response.dto'
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
            filterClauses.push(`oi.approve_by LIKE $${filterParams.length + 1}`);
            filterParams.push(`${filters.approvedBy}%`);
        }
        if (filters?.signature) {
            filterClauses.push(`o.signature LIKE $${filterParams.length + 1}`);
            filterParams.push(`${filters.signature}%`);
        }

        const whereSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

        // 💡 1. เติม MAX(s.supplier_name) as supplier_name ที่ระดับบนสุดของออเดอร์ตามคำขอครับ
        const dataSql = `
                SELECT o.id, o.signature, o.created_date, o.created_by, o.order_date,
                        MAX(s.supplier_name) as supplier_name, 
                        COALESCE(
                        json_agg(
                            json_build_object(
                            'id', oi.id, 
                            'inventory_name', inv.inventory_name,
                            'supplier_id', oi.supplier_id,       
                            'supplier_name', s.supplier_name,
                            'unit', u.id,
                            'unit_name', u.unit_name,
                            'quantity', oi.quantity, 
                            'order_quantity', oi.order_quantity,
                            'approve_status', oi.approve_status,
                            'approve_by', oi.approve_by,
                            'approve_date', oi.approve_date
                            )
                        ) FILTER (WHERE oi.id IS NOT NULL), '[]'
                        ) as items
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN inventories inv ON oi.inventory_id = inv.id
                LEFT JOIN suppliers s on oi.supplier_id = s.id 
                LEFT JOIN units u on inv.unit_id  = u.id
                ${whereSql}
                GROUP BY o.id
                ORDER BY o.created_date DESC 
                LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}
                `;

        const countSql = `
            SELECT COUNT(DISTINCT o.id) as count 
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            ${whereSql}
        `;

        const [dataResult, countResult] = await Promise.all([
            query<ListSuppliersQueryDto>(dataSql, [...filterParams, limit, offset]),
            query<{ count: string }>(countSql, filterParams)
        ]);

        // 💡 2. ทำการ map เพื่อปรับแต่งไทป์ตัวแปรของแต่ละแถวให้ปลอดภัย ไทป์นิ่งๆ ก่อนส่งกลับไปหน้าเพจ
        const sanitizedRows = dataResult.rows.map((row: any) => ({
            ...row,
            id: Number(row.id), // มั่นใจได้ว่าเป็นตัวเลขแน่นอน
            supplier_name: row.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย',
            order_date: row.order_date || row.created_date
        }));

        return { data: sanitizedRows, total: Number(countResult.rows[0]?.count ?? 0) };
    },

    async create(data: CreateOrderPayload & { createdBy: string }): Promise<OrderResponse> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const orderSql = `
            INSERT INTO orders (signature, created_by, created_date)
            VALUES ($1, $2, $3)
            RETURNING id;
        `;
            const orderRes = await client.query(orderSql, [data.signature, data.createdBy, new Date()]);
            const newOrderId = orderRes.rows[0].id;

            const itemSql = `
            INSERT INTO order_items (order_id, inventory_id, quantity, order_quantity, delivery_when, approve_status, supplier_id)
            VALUES ($1, $2, $3, $4, $5, 'PENDING', (SELECT supplier_id FROM inventories WHERE id = $2));
        `;
            for (const item of data.items) {
                await client.query(itemSql, [newOrderId, item.inventory_id, item.quantity, item.order_quantity, item.delivery_when]);
            }

            const dtoSql = `
            SELECT o.id, o.signature, o.created_date, o.created_by, o.order_date,
                   MAX(s.supplier_name) as supplier_name,
                   COALESCE(
                     json_agg(
                       json_build_object(
                         'id', oi.id::text, 
                         'inventory_id', oi.inventory_id::text, 
                         'inventory_name', inv.inventory_name,
                         'supplier_id', oi.supplier_id::text, 
                         'supplier_name', s.supplier_name,
                         'unit', u.id,
                         'unit_name', u.unit_name,
                         'quantity', oi.quantity, 
                         'order_quantity', oi.order_quantity,
                         'delivery_when', oi.delivery_when,
                         'approve_status', oi.approve_status,
                         'approve_by', oi.approve_by,
                         'approve_date', oi.approve_date
                       )
                     ) FILTER (WHERE oi.id IS NOT NULL), '[]'
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN inventories inv ON oi.inventory_id = inv.id
            LEFT JOIN suppliers s ON oi.supplier_id = s.id 
            LEFT JOIN units u ON inv.unit_id = u.id
            WHERE o.id = $1
            GROUP BY o.id;
        `;
            const finalRes = await client.query(dtoSql, [newOrderId]);
            await client.query('COMMIT');

            const rawRow = finalRes.rows[0];
            if (rawRow) {
                rawRow.id = Number(rawRow.id);
                if (!rawRow.order_date) rawRow.order_date = rawRow.created_date || new Date();
                if (!rawRow.supplier_name) rawRow.supplier_name = 'ไม่ระบุผู้จัดจำหน่าย';
            }

            return OrderResponseSchema.parse(rawRow);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async approveBySupplier(orderId: number, supplierId: string, approvedBy: string): Promise<boolean> {
        const now = new Date();
        const sql = `
            UPDATE order_items 
            SET approve_status = 'APPROVED', 
                approve_by = $1, 
                approve_date = $2 
            WHERE order_id = $3 AND supplier_id = $4;
        `;
        const { rowCount } = await query(sql, [approvedBy, now, orderId, supplierId]);
        return (rowCount ?? 0) > 0;
    },

    async delete(id: number): Promise<boolean> {
        const { rowCount } = await query(`DELETE FROM orders WHERE id = $1`, [id]);
        return (rowCount ?? 0) > 0;
    }
};