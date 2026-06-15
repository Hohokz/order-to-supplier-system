import type { QueryResultRow } from 'pg';

export interface OrderItem extends QueryResultRow {
    id: string;
    inventory_id: string;
    order_id: number;
    quantity: number;
}