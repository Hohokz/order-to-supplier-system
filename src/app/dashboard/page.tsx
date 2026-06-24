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

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const limit = 10;

  const [searchInputs, setSearchInputs] = useState({
    orderDate: '',
    approvedBy: '',
    signature: '',
  });

  const [appliedFilters, setAppliedFilters] = useState({
    orderDate: '',
    approvedBy: '',
    signature: '',
  });

  // 💡 1. ปรับไทป์ orderId จาก string เป็น number ให้ตรงสเปกตาราง
  const handleApproveOrder = async (orderId: number, supplierId: string) => {
    try {
      setError('');
      // ยิง PATCH ข้ามไปหา Endpoint เส้นใหม่ที่คุณเพิ่งทำเสร็จได้เลย
      await apiClient.patch(`/api/orders/${orderId}/approve-supplier`, { supplier_id: supplierId });

      // 💡 2. เจาะลึกไปอัปเดตสเตตัสเฉพาะไอเทมของ Supplier เจ้านี้ในรายการออเดอร์ทั้งหมด
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
              ...order,
              items: order.items.map((item) =>
                item.supplier_id === supplierId
                  ? {
                    ...item,
                    approve_status: 'APPROVED',
                    approve_by: user?.username || 'Authorized User',
                    approve_date: new Date().toISOString(),
                  }
                  : item
              ),
            }
            : order
        )
      );

      // 💡 3. เจาะลึกไปอัปเดตสเตตัสเฉพาะไอเทมของ Supplier เจ้านี้ในป๊อปอัป Modal ที่กำลังเปิดอยู่
      setSelectedOrder((prevSelected) =>
        prevSelected && prevSelected.id === orderId
          ? {
            ...prevSelected,
            items: prevSelected.items.map((item) =>
              item.supplier_id === supplierId
                ? {
                  ...item,
                  approve_status: 'APPROVED',
                  approve_by: user?.username || 'Authorized User',
                  approve_date: new Date().toISOString(),
                }
                : item
            ),
          }
          : prevSelected
      );

    } catch (err: unknown) {
      console.error('Approve failure:', err);
      const message = err instanceof Error ? err.message : 'ระบบไม่สามารถอนุมัติรายการได้';
      setError(message);
      throw err;
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.user_role === 'OBSERVER') {
        router.push('/order');
      }
    }
  }, [isAuthenticated, isAuthLoading, user, router]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError('');

        const payload = {
          page: page,
          limit: limit,
          filters: {
            orderDate: appliedFilters.orderDate || "null",
            approvedBy: appliedFilters.approvedBy || "",
            signature: appliedFilters.signature || ""
          }
        };

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
        setOrders(mockApiResponse.data);
        setTotalPages(mockApiResponse.totalPages);
        setTotalItems(mockApiResponse.total);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, isAuthLoading, page, appliedFilters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters(searchInputs);
  };

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

      <main className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-6 border-b border-zinc-200 pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">ภาพรวมคำสั่งซื้อ</h1>
              <p className="text-xs text-zinc-500 mt-1">สิทธิ์ใช้งาน: {user?.user_role || 'Guest'}</p>
            </div>
          </div>

          {/* 🔍 กล่องค้นหาคุมสไตล์โครงร่างมนกลมสมดุล */}
          <form onSubmit={handleSearchSubmit} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">วันที่สั่งซื้อ</label>
                <input
                  type="date"
                  value={searchInputs.orderDate}
                  onChange={(e) => setSearchInputs(prev => ({ ...prev, orderDate: e.target.value }))}
                  className="border border-zinc-200 bg-zinc-50/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-black transition-all font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">ผู้อนุมัติเอกสาร</label>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อผู้อนุมัติ..."
                  value={searchInputs.approvedBy}
                  onChange={(e) => setSearchInputs(prev => ({ ...prev, approvedBy: e.target.value }))}
                  className="border border-zinc-200 bg-zinc-50/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-black transition-all font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">ชื่อผู้ลงนาม (Signature)</label>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อผู้ลงนาม..."
                  value={searchInputs.signature}
                  onChange={(e) => setSearchInputs(prev => ({ ...prev, signature: e.target.value }))}
                  className="border border-zinc-200 bg-zinc-50/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-black transition-all font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-1.5 text-xs font-bold text-zinc-400 hover:text-black rounded-xl hover:bg-zinc-50 transition-all"
              >
                ล้างตัวกรอง
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 rounded-full bg-black text-white text-xs font-bold shadow-sm hover:bg-zinc-800 transition-all"
              >
                ค้นหาข้อมูล
              </button>
            </div>
          </form>

          <OrderTable
            orders={orders}
            isLoading={isLoading}
            error={error}
            onOrderClick={(order) => setSelectedOrder(order)}
          />
        </div>

        {/* 📑 แถบสลับหน้าเว็บ (Pagination Bar) สไตล์แคปซูลเรียบหรู */}
        <div className="mt-8 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-400 bg-transparent">
          <div>
            แสดงรายการทั้งหมด <strong className="text-zinc-800 font-mono">{totalItems}</strong> รายการ (หน้า {page} จาก {totalPages})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="px-4 py-1.5 rounded-full border border-zinc-200 bg-white text-xs font-bold text-zinc-600 shadow-sm hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← ย้อนกลับ
            </button>

            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              className="px-4 py-1.5 rounded-full border border-zinc-200 bg-white text-xs font-bold text-zinc-600 shadow-sm hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
      id: 4, // 💡 ปรับเป็น number เรียบร้อย
      signature: "Apiwat",
      created_date: "2026-06-17T08:32:35.318Z",
      created_by: "pi",
      order_date: null,
      items: [
        {
          id: "58b22995-ee3c-4537-a194-b392bfaee481",
          inventory_id: "inv-a101",
          inventory_name: "วัตถุดิบ A",
          supplier_id: "sup-a001", // 💡 เพิ่มไอดีซัพพลายเออร์จำลองสำหรับคัดกรองแท็บ
          supplier_name: "บริษัท เอ จำกัด",
          unit: "KG",
          unit_name: "กิโลกรัม",
          quantity: 5,
          order_quantity: 5,
          approve_status: "PENDING", // 💡 ย้ายมาอยู่ระดับไอเทมรายชิ้นตามระเบียบใหม่
          approve_by: null,          // 💡 ย้ายมาอยู่ระดับไอเทมรายชิ้นตามระเบียบใหม่
          approve_date: null         // 💡 ย้ายมาอยู่ระดับไอเทมรายชิ้นตามระเบียบใหม่
        }
      ]
    }
  ],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1
};