import { NextResponse } from 'next/server';
import { orderDashboardService } from './dashboard.service';

export const orderDashboardController = {
  /**
   * คอนโทรลเลอร์สำหรับดึงข้อมูลรายการออเดอร์ไปแสดงผลบนหน้า Dashboard ของ APPROVER
   */
  async getDashboardOrders(req: Request) {
    try {
      const body = await req.json();
      
      // แกะค่าพารามิเตอร์พร้อมทำ Fallback ป้องกันค่า NaN หรือ Undefined
      const page = Number(body.page) || 1;
      const limit = Number(body.limit) || 10;
      const filters = body.filters || {};

      // เรียกใช้งาน Service เลเยอร์ถัดไป
      const result = await orderDashboardService.listDashboardOrders(page, limit, filters);

      // ส่ง JSON Response กลับไปหาหน้าบ้านแบบหล่อๆ สเตตัส 200
      return NextResponse.json(result);
    } catch (error) {
      console.error('🔴 [OrderDashboardController] Error:', error);
      
      // ดักจับและส่ง Error Response สเตตัส 500 กรณีระบบภายในมีปัญหา
      return NextResponse.json(
        { error: 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้ กรุณาลองใหม่อีกครั้ง' }, 
        { status: 500 }
      );
    }
  }
};