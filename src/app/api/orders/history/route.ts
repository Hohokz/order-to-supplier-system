import { NextResponse } from 'next/server';
import { orderService } from '@/modules/order/order.service';

export async function GET() {
    try {
        const historyMap = await orderService.getItemHistoryMap();
        return NextResponse.json(historyMap);
    } catch (error) {
        console.error('Error fetching order history:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}