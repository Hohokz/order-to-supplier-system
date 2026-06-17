import { NextRequest, NextResponse } from 'next/server';
import { orderService } from './order.service';
import { CreateOrderInput } from './dto/input-order';
import { SearchOrderInput } from './dto/list-order.dto'; 
import { requireAuth, requireRole } from '../../lib/auth-guard';
import { handleError } from '@/lib/error-handler';

export const orderController = {
    async list(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            // ใช้ Pattern เดียวกัน แกะจาก Body JSON ตามแบบคลังสินค้า
            const body = SearchOrderInput.parse(await req.json());
            const { page, limit, filters } = body;

            const result = await orderService.listOrders(page, limit, filters);
            return NextResponse.json(result);
        } catch (err) {
            return handleError(err);
        }
    },

    async create(req: NextRequest) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            const body = CreateOrderInput.parse(await req.json());
            const order = await orderService.createOrder({
                ...body,
                createdBy: auth.sub // เปลี่ยนเป็น auth.sub ตามคลังสินค้า
            });
            return NextResponse.json(order, { status: 201 });
        } catch (err) {
            return handleError(err);
        }
    },

    async delete(req: NextRequest, params: { id: string }) {
        try {
            const auth = requireAuth(req);
            requireRole(auth, 'APPROVER');

            // แปลง id เป็น Number ให้เข้ากับตาราง orders ใน DB
            await orderService.deleteOrder(Number(params.id));
            return NextResponse.json({ success: true });
        } catch (err) {
            return handleError(err);
        }
    },
};