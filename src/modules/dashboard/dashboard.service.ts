import { orderRepository } from '../order/order.repository';
import { query } from '@/lib/db';
// 🚀 อิมพอร์ต Type ข้ามมาจากไฟล์ DTO ที่เพิ่งแยกเมื่อกี้
import type { SupplierInventoryRow, OrderItem } from './dto/dashboard-order.dto';

export const orderDashboardService = {
    /**
     * สำหรับหน้า Dashboard ของ APPROVER โดยเฉพาะ
     */
    async listDashboardOrders(page: number, limit: number, filters?: { orderDate?: string; approvedBy?: string; signature?: string }) {
        const { data: orders, total } = await orderRepository.findAll(page, limit, filters);

        if (orders.length === 0) {
            return { data: [], total, page, limit, totalPages: 0 };
        }
        console.log(orders)

        const supplierIds = Array.from(
            new Set(
                orders.flatMap(order =>
                    (order.items as OrderItem[]).map((item) => item.supplier_id).filter(Boolean)
                )
            )
        );

        let allSupplierInventories: SupplierInventoryRow[] = [];

        if (supplierIds.length > 0) {
            const invSql = `
        SELECT 
          inv.id as inventory_id,
          inv.seq,
          inv.inventory_name,
          inv.supplier_id::text,
          s.supplier_name,
          u.id as unit,
          u.unit_name,
          inv.inventory_quantity as quantity,
          inv.safety_quantity
        FROM inventories inv
        LEFT JOIN suppliers s ON inv.supplier_id = s.id
        LEFT JOIN units u ON inv.unit_id = u.id
        WHERE inv.supplier_id = ANY($1);
      `;
            const invRes = await query<SupplierInventoryRow>(invSql, [supplierIds]);
            allSupplierInventories = invRes.rows;
        }

        // [Hydration Phase] วนลูปจับคู่เพื่อประกอบร่างไอเทม 0 ชิ้นที่ไม่ได้สั่ง
        const hydratedOrders = orders.map(order => {
            const orderItems = order.items as OrderItem[];

            // 🚀 1. หา supplier_id "ทั้งหมด" ที่อยู่ในบิลนี้ (แบบไม่ซ้ำกัน)
            const orderSupplierIds = Array.from(
                new Set(orderItems.map(item => item.supplier_id).filter(Boolean))
            );

            // ถ้าไม่มีสินค้าในบิลเลย ให้คืนค่าเดิมกลับไป
            if (orderSupplierIds.length === 0) return order;

            // 🚀 2. ดึง Catalog ของ "ทุกซัพพลายเออร์" ที่อยู่ในบิลนี้มาเตรียมไว้
            const orderCatalog = allSupplierInventories.filter(
                inv => orderSupplierIds.includes(inv.supplier_id)
            );

            // 3. ประกอบร่างไอเทมทั้งหมดที่สั่ง และไอเทม 0 ชิ้น
            const fullItemsList = orderCatalog.map((catalogItem): OrderItem => {
                const orderedItem = orderItems.find(
                    (oi: OrderItem) => oi.inventory_id === catalogItem.inventory_id
                );

                if (orderedItem) {
                    // ผสมร่าง orderedItem เดิม เข้ากับ safety_quantity จาก catalogItem
                    return {
                        ...orderedItem,
                        seq: catalogItem.seq,
                        order_seq: orderedItem.order_seq,
                        safety_quantity: Number(catalogItem.safety_quantity)
                    };
                } else {
                    // กรณีไม่ได้สั่ง (NOT_ORDERED)
                    return {
                        id: `not-ordered-${catalogItem.inventory_id}`,
                        seq: catalogItem.seq,
                        inventory_id: catalogItem.inventory_id,
                        inventory_name: catalogItem.inventory_name,
                        supplier_id: catalogItem.supplier_id,
                        supplier_name: catalogItem.supplier_name,
                        unit: catalogItem.unit,
                        unit_name: catalogItem.unit_name,
                        quantity: Number(catalogItem.quantity),
                        order_quantity: 0,
                        approve_status: 'NOT_ORDERED',
                        approve_by: null,
                        approve_date: null,
                        safety_quantity: Number(catalogItem.safety_quantity)
                    };
                }
            });

            return { ...order, items: fullItemsList };
        });

        return {
            data: hydratedOrders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
};