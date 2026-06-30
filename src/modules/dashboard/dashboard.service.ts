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
            // ดึง supplier_id จากรายการที่มีอยู่จริงก่อน (ถ้า order ว่างเปล่า ให้ข้ามไป)
            const mainSupplierId = orderItems.length > 0 ? orderItems[0].supplier_id : null;

            if (!mainSupplierId) return order;

            // กรองข้อมูล Master Catalog ของซัพพลายเออร์เจ้านี้มาเตรียมไว้
            const supplierCatalog = allSupplierInventories.filter(
                inv => inv.supplier_id === mainSupplierId
            );

            const fullItemsList = supplierCatalog.map((catalogItem): OrderItem => {
                const orderedItem = orderItems.find(
                    (oi: OrderItem) => oi.inventory_id === catalogItem.inventory_id
                );

                if (orderedItem) {
                    // 🚀 แก้ไขจุดนี้: ผสมร่าง orderedItem เดิม เข้ากับ safety_quantity จาก catalogItem
                    return {
                        ...orderedItem,
                        safety_quantity: Number(catalogItem.safety_quantity)
                    };
                } else {
                    // กรณีไม่ได้สั่ง (NOT_ORDERED)
                    return {
                        id: `not-ordered-${catalogItem.inventory_id}`,
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