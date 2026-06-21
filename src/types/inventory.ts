export interface MasterInventoryRow {
  id: string;
  inventory_name: string;
  supplier: {
    id: string;
    supplier_name: string;
  };
  unit: {
    id: string;
    unit_name: string;
  };
  // ฟิลด์อื่นๆ ปล่อยผ่านได้เพราะเราใช้แค่นี้
}

export interface MasterInventoryResponse {
  rows: MasterInventoryRow[];
  rowCount: number;
}