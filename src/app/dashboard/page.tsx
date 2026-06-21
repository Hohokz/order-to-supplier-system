'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

import { OrderWithItems, ApiResponse } from '@/types/order'; 

import { Sidebar } from './_components/Sidebar';
import { OrderTable } from './_components/OrderTable';
import { OrderModal } from './_components/OrderModal';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // 💡 สเตตสำหรับระบบ Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const limit = 10; // ล็อกจำนวนแถวต่อหน้าไว้ที่ 10 แถวตามสเปกหลังบ้าน

  // 💡 สเตตสำหรับเก็บค่าจากกล่อง Input ค้นหา (Temporary State)
  const [searchInputs, setSearchInputs] = useState({
    orderDate: '',
    approvedBy: '',
    signature: '',
  });

  // 💡 สเตตสำหรับใช้ยิงค้นหาจริงเมื่อกดปุ่ม (Applied Filter State)
  const [appliedFilters, setAppliedFilters] = useState({
    orderDate: '',
    approvedBy: '',
    signature: '',
  });

  const handleApproveOrder = async (orderId: string) => {
    try {
      await apiClient.patch(`/api/orders/${orderId}/approve`, {});
      
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                is_approve: true,
                approved_by: user?.username || 'Authorized User',
                approved_date: new Date().toISOString(),
              }
            : order
        )
      );

      setSelectedOrder((prevSelected) =>
        prevSelected && prevSelected.id === orderId
          ? {
              ...prevSelected,
              is_approve: true,
              approved_by: user?.username || 'Authorized User',
              approved_date: new Date().toISOString(),
            }
          : prevSelected
      );

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ระบบไม่สามารถอนุมัติรายการได้';
      setError(message);
      throw err;
    }
  };

  // ดักเช็คสิทธิ์เข้าใช้งาน
  useEffect(() => {
  if (!isAuthLoading) {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.user_role === 'OBSERVER') {
      // 💡 ถ้าล็อกอินแล้วแต่สิทธิ์เป็น OBSERVER ให้ย้ายไปหน้าทำใบสั่งซื้อทันที
      router.push('/order');
    }
  }
}, [isAuthenticated, isAuthLoading, user, router]);

  // 💡 ดึงข้อมูลโดยผูกค่าร่วมกับตัวแปร [page] และ [appliedFilters]
  useEffect(() => {
  if (isAuthLoading || !isAuthenticated) return;

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError('');

      // 💡 1. ปรับโครงสร้างก้อน JSON Payload ให้ตรงกับระเบียบ POST ของคุณเป๊ะๆ
      const payload = {
        page: page,
        limit: limit,
        filters: {
          // ถ้าบนหน้าจอไม่ได้เลือกวันที่ ให้ fallback ส่งเป็นสติง "null" ไปตาม Postman ตัวอย่าง
          orderDate: appliedFilters.orderDate || "null", 
          approvedBy: appliedFilters.approvedBy || "",
          signature: appliedFilters.signature || ""
        }
      };

      // 💡 2. เปลี่ยนมาใช้ .post และชี้เป้าไปที่ Endpoints '/api/orders/all'
      const result = await apiClient.post<ApiResponse>('/api/orders/all', payload);
      
      const sorted = result.data.sort((a, b) => {
        const dateA = new Date(a.order_date || a.created_date).getTime();
        const dateB = new Date(b.order_date || b.created_date).getTime();
        return dateB - dateA;
      });
      
      setOrders(sorted);
      setTotalPages(result.totalPages || 1);
      setTotalItems(result.total || 0);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      
      // ข้อมูลจำลองเมื่อยิงไม่ผ่าน
      setOrders(mockApiResponse.data);
      setTotalPages(mockApiResponse.totalPages);
      setTotalItems(mockApiResponse.total);
    } finally {
      setIsLoading(false);
    }
  };

  fetchOrders();
}, [isAuthenticated, isAuthLoading, page, appliedFilters]);

  // ฟังก์ชันควบคุมการกด ค้นหา
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // รีเซ็ตหน้ากลับไปหน้า 1 ทุกครั้งที่เริ่มค้นหาใหม่
    setAppliedFilters(searchInputs);
  };

  // ฟังก์ชันล้างตัวคัดกรองทั้งหมด
  const handleClearFilters = () => {
    const cleared = { orderDate: '', approvedBy: '', signature: '' };
    setSearchInputs(cleared);
    setAppliedFilters(cleared);
    setPage(1);
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <Sidebar />
      
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto flex flex-col justify-between">
        <div>
          {/* ส่วนหัวข้อหลัก */}
          <div className="flex justify-between items-center mb-6 border-b border-zinc-200 pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">ภาพรวมคำสั่งซื้อ</h1>
              <p className="text-xs text-zinc-500 mt-1">สิทธิ์ใช้งาน: {user?.user_role || 'Guest'}</p>
            </div>
          </div>

          {/* 🔍 1. แผงค้นหา (Search Filter Grid) สไตล์มินิมอลจับถนัดมือบน Tablet */}
          <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* ฟิลเตอร์วันที่ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">วันที่สั่งซื้อ</label>
                <input
                  type="date"
                  value={searchInputs.orderDate}
                  onChange={(e) => setSearchInputs(prev => ({ ...prev, orderDate: e.target.value }))}
                  className="border border-zinc-200 bg-zinc-50/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black transition-all"
                />
              </div>

              {/* ฟิลเตอร์ผู้อนุมัติ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">ผู้อนุมัติเอกสาร</label>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อผู้อนุมัติ..."
                  value={searchInputs.approvedBy}
                  onChange={(e) => setSearchInputs(prev => ({ ...prev, approvedBy: e.target.value }))}
                  className="border border-zinc-200 bg-zinc-50/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black transition-all font-medium"
                />
              </div>

              {/* ฟิลเตอร์ลายเซ็น */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">ชื่อผู้ลงนาม (Signature)</label>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อผู้ลงนาม..."
                  value={searchInputs.signature}
                  onChange={(e) => setSearchInputs(prev => ({ ...prev, signature: e.target.value }))}
                  className="border border-zinc-200 bg-zinc-50/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black transition-all font-medium"
                />
              </div>
            </div>

            {/* แถบปุ่มควบคุมการค้นหา */}
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-black rounded-xl hover:bg-zinc-100 transition-all"
              >
                ล้างตัวกรอง
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-black text-white text-xs font-black shadow-sm hover:bg-zinc-800 transition-all"
              >
                ค้นหาข้อมูล
              </button>
            </div>
          </form>

          {/* ตารางแสดงผลหลัก */}
          <OrderTable 
            orders={orders}
            isLoading={isLoading}
            error={error}
            onOrderClick={(order) => setSelectedOrder(order)}
          />
        </div>

        {/* 📑 2. แถบสลับหน้าเว็บ (Pagination Bar) ท้ายหน้าจอ */}
        <div className="mt-6 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium text-zinc-500 bg-zinc-50">
          <div>
            แสดงรายการทั้งหมด <strong className="text-zinc-800">{totalItems}</strong> รายการ (หน้า {page} จาก {totalPages})
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all"
            >
              ← ย้อนกลับ
            </button>
            
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all"
            >
              ถัดไป →
            </button>
          </div>
        </div>
      </main>

      <OrderModal 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        onApprove={handleApproveOrder} 
      />
    </div>
  );
}

const mockApiResponse: ApiResponse = {
  data: [
    {
      id: "4",
      signature: "Apiwat",
      created_date: "2026-06-17T08:32:35.318Z",
      created_by: "pi",
      is_approve: false,
      approved_date: null,
      order_date: null,
      approved_by: null,
      items: [
        {
          id: "58b22995-ee3c-4537-a194-b392bfaee481",
          inventory_name: "วัตถุดิบ A",
          supplier_name: "บริษัท เอ จำกัด",
          delivery_when: "EVERY DAY",
          unit: "KG",
          unit_name: "กิโลกรัม",
          quantity: 5,
          order_quantity: 5
        },
        {
          id: "4e44638d-c789-4dae-8c9f-25023af656f5",
          inventory_name: "วัตถุดิบ B",
          supplier_name: "บริษัท เอ จำกัด",
          delivery_when: "EVERY DAY",
          unit: "BOX",
          unit_name: "กล่อง",
          quantity: 10,
          order_quantity: 10
        }
      ]
    }
  ],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1
};