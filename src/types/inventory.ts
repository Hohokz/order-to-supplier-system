// src/types/inventory.ts

export interface SupplierInfo {
  id: string;
  supplier_name: string;
}

export interface UnitInfo {
  id: string;
  unit_name: string;
}

export interface MasterInventoryRow {
  id: string;
  inventory_name: string;
  inventory_quantity: string; // รองรับ Payload ใหม่
  unit_price: string;          // รองรับ Payload ใหม่
  status: 'ACTIVE' | 'INACTIVE' | 'OUTSTOCK'; // รองรับ Payload ใหม่
  created_date?: string;
  updated_date?: string | null;
  created_by?: string;
  updated_by?: string | null;
  supplier_id?: string;
  unit_id?: string;
  supplier: SupplierInfo; // ใช้ร่วมกับของเดิมได้ ไม่ซ้ำซ้อน
  unit: UnitInfo;         // ใช้ร่วมกับของเดิมได้ ไม่ซ้ำซ้อน
}

export interface MasterInventoryResponse {
  rows: MasterInventoryRow[];
  rowCount: number;
}