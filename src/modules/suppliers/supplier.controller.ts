import { NextRequest, NextResponse } from 'next/server';
import { suppliersService } from './supplier.service';
import { CreateSupplierInput, UpdateSupplierInput } from './dto/input-supplier.dto';
import { listSuppliersQuerySchema } from './dto/list-supplier.dto';
import { requireAuth, requireRole } from '../../lib/auth-guard';
import { handleError } from '@/lib/error-handler';

export const suppliersController = {
    async list(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const url = new URL(req.url);
            const query = listSuppliersQuerySchema.parse({
                page: url.searchParams.get('page') ?? '1',
                limit: url.searchParams.get('limit') ?? '10',
            });

            const result = await suppliersService.listSuppliers(query.page, query.limit);
            return NextResponse.json(result);
        } catch (err) {
            return handleError(err);
        }
    },

    async getById(req: NextRequest, params: { id: string }) {
        try {
            requireAuth(req);
            const supplier = await suppliersService.getSupplier(params.id);
            return NextResponse.json(supplier);
        } catch (err) {
            return handleError(err);
        }
    },

    async create(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const body = UpdateSupplierInput.parse(await req.json());
            const supplier = await suppliersService.createSupplier({
                ...body,
                createdBy: auth.sub
            });
            return NextResponse.json(supplier, { status: 201 });
        } catch (err) {
            return handleError(err);
        }
    },

    async update(req: NextRequest, params: { id: string }) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const body = CreateSupplierInput.parse(await req.json());
            const updated = await suppliersService.updateSupplier(params.id, {
                ...body,
                updatedBy: auth.sub
            });
            return NextResponse.json(updated);
        } catch (err) {
            return handleError(err);
        }
    },

    async delete(req: NextRequest, params: { id: string }) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            await suppliersService.deleteSupplier(params.id);
            return NextResponse.json({ success: true });
        } catch (err) {
            return handleError(err);
        }
    },
};