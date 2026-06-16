import { NextRequest, NextResponse } from 'next/server';
import { unitsService } from './unit.service';
import { CreateUnitInput, UpdateUnitInput } from './dto/input-unit.dto';
import { listUnitsQuerySchema } from './dto/list-unit.dto';
import { requireAuth, requireRole } from '../../lib/auth-guard';
import { handleError } from '@/lib/error-handler';

export const unitsController = {
    async list(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const url = new URL(req.url);
            const query = listUnitsQuerySchema.parse({
                page: url.searchParams.get('page') ?? '1',
                limit: url.searchParams.get('limit') ?? '10',
            });

            const result = await unitsService.listUnits(query.page, query.limit);
            return NextResponse.json(result);
        } catch (err) {
            return handleError(err);
        }
    },

    async getById(req: NextRequest, params: { id: string }) {
        try {
            requireAuth(req);
            const unit = await unitsService.getUnit(params.id);
            return NextResponse.json(unit);
        } catch (err) {
            return handleError(err);
        }
    },

    async create(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const body = CreateUnitInput.parse(await req.json());
            const unit = await unitsService.createUnit({
                ...body,
                createdBy: auth.sub
            });
            return NextResponse.json(unit, { status: 201 });
        } catch (err) {
            return handleError(err);
        }
    },

    async update(req: NextRequest, params: { id: string }) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const body = UpdateUnitInput.parse(await req.json());
            const updated = await unitsService.updateUnit(params.id, {
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

            await unitsService.deleteUnit(params.id);
            return NextResponse.json({ success: true });
        } catch (err) {
            return handleError(err);
        }
    },
};