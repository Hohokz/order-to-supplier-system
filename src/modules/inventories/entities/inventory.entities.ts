import type { QueryResultRow } from 'pg';

export const INVENTORY_STATUS = ['ACTIVE', 'CHANGED', 'OUTSTOCK', 'DELAY', 'INACTIVE'] as const;
export type InventoryStatus = (typeof INVENTORY_STATUS)[number];

export interface Inventory extends QueryResultRow {
    id: string;
    inventory_name: string;
    inventory_quantity: number;
    unit_price: number;
    status: InventoryStatus;
    created_date: Date;
    created_by: string;
    updated_date: Date;
    updated_by: string;
    supplier_id: string;
    unit_id: string;
    delivery_when: string;

    supplier: { id: string; supplier_name: string };
    unit: { id: string; unit_name: string };
}