import { NextRequest, NextResponse } from 'next/server';
import { orderController } from '@/modules/order/order.controller'; // ปรับ Path ให้ตรงตามโครงสร้างโมดูลหลังบ้านของคุณ

type RouteParams = {
    params: Promise<{ id: string }> | { id: string };
};

// 🚀 ใช้สเปก PATCH สำหรับอัปเดตสถานะการอนุมัติรายชิ้นตามระเบียบ REST API
export async function PATCH(req: NextRequest, context: RouteParams) {
    // รองรับการแกะ params แบบปลอดภัยตามมาตรฐาน Next.js เวอร์ชั่นใหม่
    const resolvedParams = 'then' in context.params ? await context.params : context.params;

    return orderController.approveSupplier(req, { id: resolvedParams.id });
}