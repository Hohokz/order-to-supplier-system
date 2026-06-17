import type { QueryResultRow } from 'pg';

export interface OrderWithItems extends Order {
  items: {
    id: string; 
    inventory_id: string;
    inventory_name: string;
    quantity: number;
    order_quantity: number;
  }[];
}

export interface Order extends QueryResultRow {
    id: number;
    signature: string;
    created_date: Date;
    created_by: string;
    is_approve: boolean;
    approved_date: Date;
    order_date: Date;
    approved_by: string;
}