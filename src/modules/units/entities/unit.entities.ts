import type { QueryResultRow } from 'pg';

export interface Units extends QueryResultRow {
    id: string;
    unit_name: string;
    created_date: Date;
    created_by: string;
};