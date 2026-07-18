// src/types/order.ts

// 1. โครงสร้างหลักจากตารางฐานข้อมูล orders (อัปเดตตาม Entity ตัวใหม่)
export interface OrderEntity {
  id: number; // 💡 เปลี่ยนจาก string เป็น number เพื่อให้ตรงสเปกฐานข้อมูล PostgreSQL
  signature: string;
  created_date: string;
  created_by: string;
  order_date: string | null;
}

// 2. โครงสร้างชิ้นส่วนย่อยตัวลูก order_items (ย้ายระบบอนุมัติและเพิ่มไอดีซัพพลายเออร์)
export interface OrderItem {
  id: string;
  seq: number;
  order_seq?: number;
  inventory_id: string;
  inventory_name: string;
  supplier_id: string;   // 💡 เพิ่มเข้ามาเพื่อให้หน้าจอนำไปใช้ฟิลเตอร์แยกแท็บ และส่งยิง API อนุมัติรายซัพพลายเออร์
  supplier_name: string;
  unit: string;
  unit_name: string;
  quantity: number;
  order_quantity: number;
  safety_quantity: number;
  approve_status: 'PENDING' | 'APPROVED' | string; // 💡 ย้ายมาอยู่ระดับไอเทมรายชิ้นตามตารางใหม่
  approve_by: string | null;                        // 💡 ย้ายมาอยู่ระดับไอเทมรายชิ้นตามตารางใหม่
  approve_date: string | null;                      // 💡 ย้ายมาอยู่ระดับไอเทมรายชิ้นตามตารางใหม่
  delivery_when?: string;
  remark?: string;
}

// 3. ก้อนรวมร่างสำหรับใช้งานบนหน้าจอคอมโพเนนต์ต่างๆ
export interface OrderWithItems extends OrderEntity {
  items: OrderItem[];
  // 💡 เปิดคีย์นี้เผื่อไว้เป็น Optional (Computed) สำหรับให้หน้า Dashboard วนลูปเช็คสถานะภาพรวมของบิลได้ง่ายๆ
  is_approve?: boolean;
}

// 4. โครงสร้างรับข้อมูลตัดหน้าเพจส่งตรงจาก API (Pagination ขาออก)
export interface ApiResponse {
  data: OrderWithItems[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderHistory {
  cycle_1_stock: number | null;
  cycle_1_order: number | null;
  cycle_1_date?: string | Date | null;
  cycle_2_stock: number | null;
  cycle_2_order: number | null;
  cycle_2_date?: string | Date | null;
  cycle_3_stock: number | null;
  cycle_3_order: number | null;
  cycle_3_date?: string | Date | null;
}

export type OrderItemWithHistory = OrderItem & {
  history?: OrderHistory;
};