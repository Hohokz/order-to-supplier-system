import { pool, query } from '@/lib/db';
import { OrderResponseSchema, OrderResponse } from './dto/response/list-order-response.dto'
import type { CreateOrderPayload } from './dto/input-order';

// 🚀 1. สร้าง Interface ประกาศโครงสร้างแถวข้อมูลดิบที่ได้จาก SQL ดักไว้ตรงนี้ครับ
interface RawOrderRow {
    id: string | number;
    signature: string;
    created_date: string;
    created_by: string;
    order_date: string | null;
    supplier_name: string | null;
    items: unknown[];
}

export interface ItemHistoryRow {
    inventory_id: string;
    cycle_1_stock: number | null;
    cycle_1_order: number | null;
    cycle_1_quantity_unit: string | null; // 💡 เพิ่มเติม
    cycle_1_order_unit: string | null;
    cycle_1_supplier_remark: string | null;
    cycle_2_stock: number | null;
    cycle_2_order: number | null;
    cycle_2_quantity_unit: string | null; // 💡 เพิ่มเติม
    cycle_2_order_unit: string | null;
    cycle_2_supplier_remark: string | null;
    cycle_3_stock: number | null;
    cycle_3_order: number | null;
    cycle_3_quantity_unit: string | null;
    cycle_3_order_unit: string | null;
    cycle_3_supplier_remark: string | null;
}

export interface ItemHistoryWithDateRow {
    created_date: string | Date;
}

export const orderRepository = {
    async findAll(page: number, limit: number, filters?: { orderDate?: string; approvedBy?: string; signature?: string }) {
        const offset = (page - 1) * limit;
        const filterClauses: string[] = [];
        const filterParams: (string | number)[] = [];

        // 💡 แก้ไขจุดนี้ครับ: ดักจับไม่ให้เอาคำว่า 'null' หรือค่าว่างมาสร้างเป็นเงื่อนไข SQL
        if (filters?.orderDate && filters.orderDate !== 'null' && filters.orderDate !== '') {
            // 🚀 เติม o. นำหน้า created_date เพื่อระบุให้ชัดเจนว่าเป็นของตาราง orders ป้องกันปัญหากำกวม
            filterClauses.push(`DATE(o.created_date) = $${filterParams.length + 1}`);
            filterParams.push(filters.orderDate);
        }

        if (filters?.approvedBy && filters.approvedBy !== '') {
            filterClauses.push(`oi.approve_by LIKE $${filterParams.length + 1}`);
            filterParams.push(`${filters.approvedBy}%`);
        }

        if (filters?.signature && filters.signature !== '') {
            filterClauses.push(`o.signature LIKE $${filterParams.length + 1}`);
            filterParams.push(`${filters.signature}%`);
        }

        const whereSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

        // 🚀 ตรวจเช็คคำสั่ง SQL หลักด้านล่างด้วยว่าตรง WHERE ของเดิมเป็น whereSql แล้วหรือยัง
        const dataSql = `
                SELECT o.id, o.signature, o.created_date, o.created_by, o.order_date,
                        MAX(s.supplier_name) as supplier_name, 
                        COALESCE(
                        json_agg(
                            json_build_object(
                            'id', oi.id::text, 
                            'inventory_id', inv.id::text,
                            'inventory_name', inv.inventory_name,
                            'supplier_id', oi.supplier_id::text,       
                            'supplier_name', s.supplier_name,
                            'unit', u.id,
                            'unit_name', u.unit_name,
                            'order_unit', oi.order_unit,
                            'quantity_unit', oi.quantity_unit,
                            'quantity', oi.quantity, 
                            'order_quantity', oi.order_quantity,
                            'supplier_remark', oi.supplier_remark,
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
            query<RawOrderRow>(dataSql, [...filterParams, limit, offset]),
            query<{ count: string }>(countSql, filterParams)
        ]);

        const sanitizedRows = dataResult.rows.map((row) => ({
            ...row,
            id: Number(row.id),
            supplier_name: row.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย',
            order_date: row.order_date || row.created_date
        }));

        return { data: sanitizedRows, total: Number(countResult.rows[0]?.count ?? 0) };
    },

    async getHistoryDate(orderIds: number): Promise<ItemHistoryWithDateRow[]> {
        const historyIds = [orderIds - 1, orderIds - 2, orderIds - 3]
        const sql = `SELECT created_date FROM orders WHERE id = ANY($1::int[]) ORDER BY created_date DESC`;

        const result = await query<ItemHistoryWithDateRow>(sql, [historyIds]);
        return result.rows;
    },

    async getRecentOrderHistory(): Promise<ItemHistoryRow[]> {
        const sql = `
        WITH RankedOrders AS (
            SELECT 
            oi.inventory_id,
            oi.quantity as stock_qty,
            oi.order_quantity as order_qty,
            oi.quantity_unit as quantity_unit,
            oi.order_unit as order_unit,
            oi.supplier_remark as supplier_remark,
            o.order_date,
            ROW_NUMBER() OVER(PARTITION BY oi.inventory_id ORDER BY o.created_date DESC) as rn
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.order_quantity > 0
        )
        SELECT 
            inventory_id::text,
            MAX(CASE WHEN rn = 1 THEN stock_qty END) as cycle_1_stock,
            MAX(CASE WHEN rn = 1 THEN order_qty END) as cycle_1_order,
            MAX(CASE WHEN rn = 1 THEN quantity_unit END) as cycle_1_quantity_unit,
            MAX(CASE WHEN rn = 1 THEN order_unit END) as cycle_1_order_unit,
            MAX(CASE WHEN rn = 1 THEN supplier_remark END) as cycle_1_supplier_remark,
            MAX(CASE WHEN rn = 1 THEN order_date END) as cycle_1_date,
            
            MAX(CASE WHEN rn = 2 THEN stock_qty END) as cycle_2_stock,
            MAX(CASE WHEN rn = 2 THEN order_qty END) as cycle_2_order,
            MAX(CASE WHEN rn = 2 THEN quantity_unit END) as cycle_2_quantity_unit,
            MAX(CASE WHEN rn = 2 THEN order_unit END) as cycle_2_order_unit,
            MAX(CASE WHEN rn = 2 THEN supplier_remark END) as cycle_2_supplier_remark,
            MAX(CASE WHEN rn = 2 THEN order_date END) as cycle_2_date,
            
            MAX(CASE WHEN rn = 3 THEN stock_qty END) as cycle_3_stock,
            MAX(CASE WHEN rn = 3 THEN order_qty END) as cycle_3_order,
            MAX(CASE WHEN rn = 3 THEN quantity_unit END) as cycle_3_quantity_unit,
            MAX(CASE WHEN rn = 3 THEN order_unit END) as cycle_3_order_unit,
            MAX(CASE WHEN rn = 3 THEN supplier_remark END) as cycle_3_supplier_remark,
            MAX(CASE WHEN rn = 3 THEN order_date END) as cycle_3_date
        FROM RankedOrders
        WHERE rn <= 3
        GROUP BY inventory_id;
        `;

        const result = await query<ItemHistoryRow>(sql, []);
        return result.rows;
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
            INSERT INTO order_items (order_id, inventory_id, quantity, order_quantity, approve_status, supplier_id, order_unit, quantity_unit, supplier_remark)
            VALUES ($1, $2, $3, $4, 'PENDING', (SELECT supplier_id FROM inventories WHERE id = $2), $5, $6, $7);
        `;
            for (const item of data.items) {
                await client.query(itemSql, [newOrderId, item.inventory_id, item.quantity, item.order_quantity, item.order_unit, item.quantity_unit, item.supplier_remark]);
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
                         'quantity_unit', oi.quantity_unit,
                         'order_quantity', oi.order_quantity,
                         'delivery_when', oi.delivery_when,
                         'supplier_remark', oi.supplier_remark,
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
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const now = new Date();

            const updateItemsSql = `
                UPDATE order_items 
                SET approve_status = 'APPROVED', 
                    approve_by = $1, 
                    approve_date = $2 
                WHERE order_id = $3 AND supplier_id = $4 AND approve_status = 'PENDING'
                RETURNING inventory_id, quantity, order_quantity;
            `;
            const res = await client.query(updateItemsSql, [approvedBy, now, orderId, supplierId]);

            if ((res.rowCount ?? 0) === 0) {
                await client.query('ROLLBACK');
                return false;
            }

            // 🚀 แก้ไขจุดนี้: เปลี่ยนคำว่า quantity หลังคำว่า SET ให้เป็นชื่อคอลัมน์จริงในตารางของคุณ
            // เช่น ถ้าในเบสชื่อ stock ให้แก้เป็น SET stock = $1
            const updateInvSql = `UPDATE inventories SET inventory_quantity = $1 WHERE id = $2;`;

            for (const item of res.rows) {
                await client.query(updateInvSql, [Number(item.quantity), item.inventory_id]);
            }

            await client.query('COMMIT');
            return true;
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