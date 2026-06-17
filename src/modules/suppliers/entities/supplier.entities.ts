import type { QueryResultRow } from 'pg';

export const SUPPLIER_STATUS = ['ACTIVE', 'CHANGED', 'INACTIVE'] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUS)[number];

export interface Supplier extends QueryResultRow {
    id: string;
    supplier_name: string;
    contract_person: string;
    phone: string;
    email: string;
    address: string;
    tax_id: string;
    status: SupplierStatus;
    created_date: Date;
    created_by: string;
    updated_date: Date;
    updated_by: string;
    delivery_when: string;
}