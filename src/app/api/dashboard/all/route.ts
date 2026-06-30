import { orderDashboardController } from '@/modules/dashboard/dashboard.controller';

// 🚀 เปลี่ยนมาเรียกใช้ผ่าน Controller แบบแบ่งเลเยอร์หน้าที่ชัดเจน
export async function POST(req: Request) {
  return orderDashboardController.getDashboardOrders(req);
}