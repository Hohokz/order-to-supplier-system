import type { QueryResultRow } from 'pg';

export interface Order extends QueryResultRow {
  id: number;
  signature: string;
  created_date: Date;
  created_by: string;
  order_date: Date;
}