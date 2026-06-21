import { NextRequest, NextResponse } from 'next/server';
import { inventoriesService } from './inventory.service';
import { CreateInventoryInput, UpdateInventoryInput } from './dto/input-inventory.dto';
import { SearchInventoryInput } from './dto/list-inventory.dto';
import { requireAuth, requireRole } from '../../lib/auth-guard';
import { handleError } from '@/lib/error-handler';

export const inventoriesController = {
    async list(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const body = SearchInventoryInput.parse(await req.json());
            const { page, limit, filters } = body;

            // เรียกใช้ Service ที่ส่ง filters เข้าไป
            const result = await inventoriesService.listInventories(page, limit, filters);
            return NextResponse.json(result);
        } catch (err) {
            return handleError(err);
        }
    },

    async master(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER', 'OBSERVER');

            const result = await inventoriesService.GetMasterInventories();
            return NextResponse.json(result);
        } catch (err) {
            return handleError(err);
        }
    },

    async getById(req: NextRequest, params: { id: string }) {
        try {
            requireAuth(req);
            const inventory = await inventoriesService.getInventory(params.id);
            return NextResponse.json(inventory);
        } catch (err) {
            return handleError(err);
        }
    },

    async create(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const body = CreateInventoryInput.parse(await req.json());
            const inventory = await inventoriesService.createInventory({
                ...body,
                createdBy: auth.sub
            });
            return NextResponse.json(inventory, { status: 201 });
        } catch (err) {
            return handleError(err);
        }
    },

    async update(req: NextRequest, params: { id: string }) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const body = UpdateInventoryInput.parse(await req.json());
            const updated = await inventoriesService.updateInventory(params.id, {
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

            await inventoriesService.deleteInventory(params.id);
            return NextResponse.json({ success: true });
        } catch (err) {
            return handleError(err);
        }
    },
};