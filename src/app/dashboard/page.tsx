'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

import { Sidebar } from './_components/Sidebar';
import { OrderTable } from './_components/OrderTable';
import { OrderModal } from './_components/OrderModal';

// 1. ถอดแบบ อินเตอร์เฟส ตามโครงสร้างฐานข้อมูล pg ของคุณ
export interface Order {
  id: number;
  signature: string;
  created_date: string | Date;
  created_by: string;
  is_approve: boolean;
  approved_date: string | Date;
  order_date: string | Date;
  approved_by: string;
}

export interface OrderWithItems extends Order {
  items: {
    id: string; 
    inventory_id: string;
    inventory_name: string;
    quantity: number; // คงเหลือในคลัง
    order_quantity: number; // จำนวนที่สั่งซื้อ
  }[];
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  console.log('user', user)

  // 2. [ROUTE GUARD] ตัวดักเช็คสิทธิ์: ถ้าโหลดเสร็จแล้วพบว่าไม่ได้ล็อกอิน ให้ดีดกลับหน้า /login ทันที
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // 3. ดึงข้อมูลคำสั่งซื้อมาจัดเรียงตามวันที่ (order_date) ล่าสุดขึ้นก่อน
  useEffect(() => {
    // ถ้าระบบ Auth ยังโหลดไม่เสร็จ หรือไม่ได้ล็อกอิน ไม่ต้องวิ่งไปยิง API หลังบ้าน
    if (isAuthLoading || !isAuthenticated) return;

    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.get<OrderWithItems[]>('/api/orders');
        
        // เรียงลำดับตามวันที่สั่งซื้อล่าสุดขึ้นก่อน
        const sorted = data.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
        setOrders(sorted);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('ไม่สามารถเชื่อมต่อข้อมูลคำสั่งซื้อได้');
        }
        // บันทึกตัวทดสอบ (Mock Data) ไว้กรณีหลังบ้านยังไม่เปิดบริการช่วงรันโหมด Dev
        setOrders(mockOrdersWithItems);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, isAuthLoading]);

  // 4. ป้องกันหน้าจอแวบ: ระหว่างที่ระบบกำลังตรวจสิทธิ์ในเครื่อง ให้ขึ้นตัวหมุน Loading รอไว้ก่อน
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  // 5. ถ้าตรวจแล้วไม่มีสิทธิ์เข้าใช้งาน ไม่ต้องวาด (Render) โครงสร้างหน้าจอใดๆ ส่งค่าว่างรอย้ายหน้า
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* ชิ้นส่วนเมนูด้านซ้าย */}
      <Sidebar />

      {/* พื้นที่แสดงตารางหลัก */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8 border-b border-zinc-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">ภาพรวมคำสั่งซื้อ</h1>
            <p className="text-xs text-zinc-500 mt-1">สิทธิ์ใช้งาน: {user?.user_role || 'Guest'}</p>
          </div>
        </div>

        {/* ชิ้นส่วนตารางประมวลผลข้อมูล */}
        <OrderTable 
          orders={orders}
          isLoading={isLoading}
          error={error}
          onOrderClick={(order) => setSelectedOrder(order)}
        />
      </main>

      {/* ชิ้นส่วนหน้าต่างป๊อปอัปแสดงไอเทมลูก */}
      <OrderModal 
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}

// คลังข้อมูลจำลอง (Mock Data) สอดรับกับโครงสร้าง PostgreSQL จริงของคุณ
const mockOrdersWithItems: OrderWithItems[] = [
  {
    id: 1024,
    signature: 'SIG-88992',
    created_date: '2026-06-17T08:00:00.000Z',
    created_by: 'Anutin.P',
    is_approve: true,
    approved_date: '2026-06-17T09:30:00.000Z',
    order_date: '2026-06-17T00:00:00.000Z',
    approved_by: 'Manager.S',
    items: [
      { id: 'item-aaa', inventory_id: 'inv-01', inventory_name: 'คลังเหล็กเส้นเส้นผ่านศูนย์กลาง 12mm', quantity: 150, order_quantity: 40 },
      { id: 'item-bbb', inventory_id: 'inv-02', inventory_name: 'คลังแผ่นอะคริลิคใสพิเศษ', quantity: 12, order_quantity: 8 }
    ]
  },
  {
    id: 1023,
    signature: 'SIG-11204',
    created_date: '2026-06-16T14:20:00.000Z',
    created_by: 'Somchai.K',
    is_approve: false,
    approved_date: '1970-01-01T00:00:00.000Z',
    order_date: '2026-06-16T00:00:00.000Z',
    approved_by: '',
    items: [
      { id: 'item-ccc', inventory_id: 'inv-03', inventory_name: 'คลังท่อ PVC ตราเสือ 4 นิ้ว', quantity: 85, order_quantity: 100 }
    ]
  }
];