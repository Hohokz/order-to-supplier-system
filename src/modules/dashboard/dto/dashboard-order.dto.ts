export interface SupplierInventoryRow {
  inventory_id: string;
  inventory_name: string;
  supplier_id: string;
  supplier_name: string;
  unit: string;
  unit_name: string | null;
  quantity: number;
  safety_quantity: number; // 🚀 เพิ่มฟิลด์นี้
}

export interface OrderItem {
  id: string;
  inventory_id: string;
  inventory_name: string;
  supplier_id: string;
  supplier_name: string;
  unit: string;
  unit_name: string | null;
  quantity: number;
  order_quantity: number;
  approve_status: string;
  approve_by: string | null;
  approve_date: string | null;
  safety_quantity: number; // 🚀 เพิ่มฟิลด์นี้
}