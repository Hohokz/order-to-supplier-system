import type { QueryResultRow } from 'pg';

export interface OrderItem extends QueryResultRow {
    id: string;
    inventory_id: string;
    order_id: number;
    quantity: number;
    order_quantity: number;
    supplier_id: string;
    approve_status: string;
    approve_by: string;
    approve_date: Date;
    remark: string;
    delivery_when: string;
}