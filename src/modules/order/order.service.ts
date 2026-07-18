import { ItemHistoryWithDateRow, orderRepository } from './order.repository';
import { inventoryRepository } from '../inventories/inventory.repository';
import type { CreateOrderPayload } from './dto/input-order';
import { OrderNotFoundError, OrderSignatureIsEmpty } from './order.error';
import { InventoryNotFoundError } from '../inventories/inventory.error';
import { OrderResponse } from './dto/response/list-order-response.dto';
import { userRepository } from '../users/user.repository';
import { sendLineMessage } from '@/lib/line';
import { query } from '@/lib/db'; // 💡 1. เพิ่มอิมพอร์ตสำหรับยิง SQL ตรงเพื่อดึงรายชื่อกลุ่มผู้อนุมัติ


function transformToCycles(rows: ItemHistoryWithDateRow[]) {
  return {
    cycle_1_date: rows[0]?.created_date || null,
    cycle_2_date: rows[1]?.created_date || null,
    cycle_3_date: rows[2]?.created_date || null,
  };
}

export const orderService = {
  async listOrders(page: number, limit: number, filters?: { orderDate?: string; approvedBy?: string; signature?: string }) {
    const { data, total } = await orderRepository.findAll(page, limit, filters);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
  async getItemHistoryMap() {
    const historyRows = await orderRepository.getRecentOrderHistory();

    const historyMap: Record<string, {
      cycle_1_stock: number | null;
      cycle_1_order: number | null;
      cycle_1_date?: string | Date | null;
      cycle_2_stock: number | null;
      cycle_2_order: number | null;
      cycle_2_date?: string | Date | null;
      cycle_3_stock: number | null;
      cycle_3_order: number | null;
      cycle_3_date?: string | Date | null;
    }> = {};

    historyRows.forEach(row => {
      historyMap[row.inventory_id] = {
        cycle_1_stock: row.cycle_1_stock,
        cycle_1_order: row.cycle_1_order,
        cycle_2_stock: row.cycle_2_stock,
        cycle_2_order: row.cycle_2_order,
        cycle_3_stock: row.cycle_3_stock,
        cycle_3_order: row.cycle_3_order,
      };
    });

    return historyMap;
  },
  async getHistoryDate(orderId: number) {
    const rows = await orderRepository.getHistoryDate(orderId);
    // นำมาจัดรูปเป็น { cycle_1_date: ..., cycle_2_date: ... } ก่อนส่งให้ Controller
    return transformToCycles(rows);
  },

  async createOrder(data: CreateOrderPayload & { createdBy: string }): Promise<OrderResponse> {
    if (!data.signature?.trim()) {
      throw new OrderSignatureIsEmpty;
    }

    for (const item of data.items) {
      const inv = await inventoryRepository.findById(item.inventory_id);
      if (!inv) throw new InventoryNotFoundError();
    }

    // 1. สั่งสร้างและบันทึกใบสั่งซื้อลงฐานข้อมูลหลักตามปกติ
    const newOrder = await orderRepository.create(data);

    // 2. 🚀 [Workflow Broadcast] สอยรายชื่อ APPROVER ทุกคนที่มี LINE ID แล้วระเบิดข้อความแจ้งเตือนทันที
    try {
      // 🔎 ค้นหาผู้อนุมัติทุกคนในตาราง users ที่ผูกไอดีไลน์ (รหัสตัว U) ไว้แล้ว
      const approverSql = `SELECT DISTINCT line_id FROM users WHERE user_role = 'APPROVER' AND line_id IS NOT NULL`;
      const approversRes = await query<{ line_id: string }>(approverSql);
      const approverList = approversRes.rows;

      if (approverList.length > 0) {
        // 🔗 เจนเนอเรทลิงก์ตรงสำหรับกดเปิดดูใบออเดอร์นี้จากในแอป LINE ทันที
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const directLink = `${baseUrl}/dashboard?openOrder=${newOrder.id}`;

        const messageText = `📦 มีใบสั่งซื้อวัตถุดิบใหม่รอยืนยันอนุมัติ!\n\nเลขที่คำสั่งซื้อ: #${newOrder.id}\nผู้จัดทำเอกสาร: ${data.signature}\n\n🔗 ท่านสามารถเปิดดูใบสั่งซื้อและกดอนุมัติทันทีได้ที่ลิงก์นี้:\n${directLink}`;

        // 📲 สั่งยิงกระจายข้อความหา APPROVER ทุกคนพร้อมกันแบบขนาน (Concurrent)
        // ข้อดีของการใช้ allSettled คือถ้าไลน์พนักงานบางคนล่ม คนที่เหลือก็ยังคงได้รับแจ้งเตือนตามปกติ
        const uniqueLineIds = Array.from(new Set(approverList.map(a => a.line_id)));
        await Promise.allSettled(
          uniqueLineIds.map(lineId => sendLineMessage(lineId, messageText))
        );
      }
    } catch (lineError) {
      // 🔒 ดักจับเอเรอร์ฝั่ง LINE ไว้ตรงนี้ เพื่อไม่ให้ออเดอร์ที่สร้างผ่านใน DB สำเร็จไปแล้วต้องโดนยกเลิก
      console.error('🚨 ระบบกระจายข้อความแจ้งเตือน APPROVER ขัดข้อง:', lineError);
    }

    return newOrder;
  },

  async approveOrderSupplier(orderId: number, supplierId: string, approvedBy: string): Promise<void> {
    if (!supplierId) {
      throw new Error('Supplier ID is required for approval');
    }

    // 1. สั่งอัปเดตสเตตัสในตาราง order_items และตัดยอดจากตาราง inventories หลังบ้านตามปกติก่อน
    const isUpdated = await orderRepository.approveBySupplier(orderId, supplierId, approvedBy);

    if (!isUpdated) {
      throw new Error('ไม่พบรายการคำสั่งซื้อของซัพพลายเออร์รายนี้ในระบบ หรืออาจถูกอนุมัติไปแล้ว');
    }

    // 2. 📲 [Workflow Notification] ดึงรายชื่อสินค้าและซัพพลายเออร์มามัดรวมเพื่อรัน No. ส่งเข้าไลน์
    try {
      // 🔎 ยิง SQL คิวรีดึงชื่อซัพพลายเออร์ ชื่อสินค้า จำนวนส่ง และชื่อหน่วยนับออกมารวดเดียว
      const itemsSql = `
        SELECT 
          inv.inventory_name,
          s.supplier_name,
          oi.order_quantity,
          u.unit_name
        FROM order_items oi
        LEFT JOIN inventories inv ON oi.inventory_id = inv.id
        LEFT JOIN suppliers s ON oi.supplier_id = s.id
        LEFT JOIN units u ON inv.unit_id = u.id
        WHERE oi.order_id = $1 AND oi.supplier_id = $2;
      `;
      const itemsRes = await query<{ inventory_name: string; supplier_name: string; order_quantity: unknown; unit_name: string | null }>(itemsSql, [orderId, supplierId]);
      const approvedItems = itemsRes.rows;

      if (approvedItems.length > 0) {
        // ดึงชื่อซัพพลายเออร์จากแถวแรกขึ้นมาแปะหัวข้อบิล
        // 🔄 วนลูปเพื่อทำการรัน No. (1, 2, 3...) และผูกชื่อสินค้ากับจำนวนทศนิยมส่ง
        let itemsText = '';
        approvedItems.forEach((item, index) => {
          itemsText += `${index + 1}. ${item.inventory_name} - ${Number(item.order_quantity)} \n`;
        });

        // ค้นหา line_id ของตัวคนกดอนุมัติในระบบ
        const approverEntity = await userRepository.findById(approvedBy);

        if (approverEntity && approverEntity.line_id) {
          // ประกอบร่างข้อความแจ้งเตือนรูปแบบใหม่
          const messageText = `รายการสินค้าที่จัดส่ง:\n${itemsText.trim()}\n\n`;

          // ยิงข้อความตรงเข้าไลน์ทันที
          await sendLineMessage(approverEntity.line_id, messageText);
          console.log(`📲 ส่งรายละเอียดรายงานสรุปบิลรัน No. ไปยังไลน์ของ (${approvedBy}) สำเร็จ!`);
        } else {
          console.warn(`⚠️ ไม่สามารถส่งไลน์ได้: ไม่พบข้อมูล line_id ของผู้ใช้ชื่อ (${approvedBy})`);
        }
      }
    } catch (lineError) {
      console.error('🚨 เกิดข้อผิดพลาดในลอกจิกดึงรายละเอียดบิลส่งไลน์:', lineError);
    }
  },

  async deleteOrder(id: number): Promise<void> {
    const deleted = await orderRepository.delete(id);
    if (!deleted) throw new OrderNotFoundError();
  }
};