import { NextRequest, NextResponse } from 'next/server';
import { orderController } from '@/modules/order/order.controller';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } // 💡 เปลี่ยนตรงนี้เป็น Promise
) {
    // 💡 ต้อง await params ตรงนี้ครับ
    const resolvedParams = await params;

    // ส่ง id ที่ได้จาก resolvedParams เข้าไป
    return orderController.getHistoryDate(req, { id: resolvedParams.id });
}