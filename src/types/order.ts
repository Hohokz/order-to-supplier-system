// src/types/order.ts

// 1. โครงสร้างดิบจากตารางฐานข้อมูล
export interface OrderEntity {
  id: string;
  signature: string;
  created_date: string;
  created_by: string;
  is_approve: boolean;
  approved_date: string | null;
  order_date: string | null;
  approved_by: string | null;
}

// 2. โครงสร้างชิ้นส่วนย่อยตัวลูก (แก้ชื่อให้ตรงกับหน้าจอ)
export interface OrderItem {
  id: string;
  inventory_name: string;
  supplier_name: string;
  delivery_when: string;
  unit: string;
  unit_name: string;
  quantity: number;
  order_quantity: number;
}

// 3. ก้อนรวมร่างสำหรับใช้งาน (แก้ชื่อให้ตรงกับหน้าจอ)
export interface OrderWithItems extends OrderEntity {
  items: OrderItem[];
}

// 4. โครงสร้างรับข้อมูลตัดหน้าเพจจาก API (แก้ชื่อให้ตรงกับหน้าจอ)
export interface ApiResponse {
  data: OrderWithItems[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}