'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { OrderItem } from '@/types/order';
import { Sidebar } from '../dashboard/_components/Sidebar';

export default function OrderPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const router = useRouter();

  // สเตตหลักสำหรับจัดการฟอร์มสั่งซื้อ
  const [items, setItems] = useState<OrderItem[]>([]);
  const [signature, setSignature] = useState<string>('');
  const [activeSupplier, setActiveSupplier] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ดักเช็คสิทธิ์การเข้าใช้งานหน้าฟอร์ม
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // ดึงรายการสินค้าตั้งต้นทั้งหมดจากคลังสินค้ามาแสดงให้พนักงานเลือกกรอก
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    const fetchInitialItems = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.get<OrderItem[]>('/api/inventories/master-items');
        setItems(data);
      } catch {
        // กรณีโหมด Dev หรือหลังบ้านยังไม่มี API ให้ดึงของจาก Payload จำลองมาเปิดหน้าจอรอไว้ก่อน
        setItems(mockMasterItems);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialItems();
  }, [isAuthenticated, isAuthLoading]);

  // จัดกลุ่มไอเทมแยกตามชื่อ Supplier
  const groupedItems = items.reduce((acc, item) => {
    const supplier = item.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย';
    if (!acc[supplier]) acc[supplier] = [];
    acc[supplier].push(item);
    return acc;
  }, {} as Record<string, OrderItem[]>);

  const supplierNames = Object.keys(groupedItems);

  // เลือกแท็บแรกให้อัตโนมัติเมื่อดึงข้อมูลเสร็จ
  useEffect(() => {
    if (supplierNames.length > 0 && !activeSupplier) {
      setActiveSupplier(supplierNames[0]);
    }
  }, [items, supplierNames, activeSupplier]);

  // ฟังก์ชันดักจับและอัปเดตตัวเลขที่กรอกในฟอร์มแบบรายชิ้น
  const handleNumberChange = (itemId: string, field: 'quantity' | 'order_quantity', val: string) => {
    const numericValue = val === '' ? 0 : parseInt(val, 10);
    if (isNaN(numericValue)) return;

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, [field]: numericValue } : item
      )
    );
  };

  // ลอจิกการส่งใบสั่งซื้อชุดนี้ไปบันทึกที่ฐานข้อมูล PostgreSQL หลังบ้าน
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!signature.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกชื่อผู้ลงนาม (Signature) ก่อนส่งเอกสาร' });
      return;
    }

    const filteredItems = items.filter((item) => item.order_quantity > 0);
    if (filteredItems.length === 0) {
      setMessage({ type: 'error', text: 'กรุณากรอกจำนวนที่ต้องการสั่งเพิ่มอย่างน้อย 1 รายการ' });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        signature: signature.trim(),
        created_by: user?.username || 'System',
        items: filteredItems,
      };

      await apiClient.post('/api/orders', payload);

      setMessage({ type: 'success', text: 'ส่งใบจัดทำคำสั่งซื้อเข้าสู่ระบบสำเร็จแล้ว!' });
      setSignature('');
      setItems(prev => prev.map(item => ({ ...item, quantity: 0, order_quantity: 0 })));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่รู้จักในการบันทึกข้อมูล';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const currentItems = groupedItems[activeSupplier] || [];

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 font-sans">
    <Sidebar /> {/* ตรงนี้จะกลายเป็น null อัตโนมัติ ทำให้ตารางขยายเต็มจอคอม/Tablet */}

    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">

      {/* ปรับปรุงท่อนหัวข้อให้ยืดหยุ่นแสดงปุ่ม Logout */}
      <div className="mb-6 border-b border-zinc-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">จัดทำใบสั่งซื้อวัตถุดิบ</h1>
          <p className="text-xs text-zinc-500 mt-1">ผู้บันทึกรายการ: {user?.username} ({user?.user_role})</p>
        </div>

        {/* 💡 เพิ่มปุ่มออกจากระบบเฉพาะกลุ่ม OBSERVER ที่ไม่มีแผง Sidebar ด้านข้าง */}
        {user?.user_role === 'OBSERVER' && (
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 text-xs font-bold shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-95 transition-all duration-150"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>ออกจากระบบ</span>
          </button>
        )}
      </div>

        {message && (
          <div className={`mb-4 p-4 rounded-xl text-sm font-bold border ${
            message.type === 'success' ? 'bg-zinc-900 text-white border-black' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 💡 ฟอร์มหลักคุมตู้คอนเทนเนอร์เดียวแบบไร้รอยต่อ */}
        <form onSubmit={handleSubmitOrder} className="space-y-6">

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">

            {/* แถบเลือกรายชื่อ Supplier */}
            <div className="bg-zinc-50 border-b border-zinc-200 flex items-center overflow-x-auto scrollbar-none divide-x divide-zinc-200">
              {supplierNames.map((name) => {
                const isActive = activeSupplier === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveSupplier(name)}
                    className={`px-6 py-4 text-sm font-bold text-center whitespace-nowrap min-w-[140px] transition-all focus:outline-none
                      ${isActive ? 'bg-white text-black border-b-4 border-b-black font-black shadow-inner' : 'text-zinc-500 hover:bg-zinc-100/50'}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* พื้นที่เนื้อหาตารางข้อมูลสินค้า */}
            <div className="p-4 md:p-6">
              <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-600 uppercase text-center">
                        <th className="p-4 text-left min-w-[200px]">ชื่อสินค้า</th>
                        <th className="p-4 whitespace-nowrap bg-zinc-50/30">2 รอบก่อนหน้า</th>
                        <th className="p-4 whitespace-nowrap bg-zinc-50/30">1 รอบก่อนหน้า</th>
                        <th className="p-4 whitespace-nowrap text-zinc-900 bg-zinc-100/40 w-32">คงเหลือ</th>
                        <th className="p-4 whitespace-nowrap text-black font-black bg-zinc-100/80 w-32">สั่งเพิ่ม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {currentItems.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50/30 transition-colors text-center">
                          
                          <td className="p-4 font-bold text-zinc-800 text-left">
                            {item.inventory_name}
                            <p className="text-[10px] font-medium text-zinc-400 mt-0.5">หน่วยนับ: {item.unit_name} ({item.unit})</p>
                          </td>

                          <td className="p-4 font-mono text-zinc-400 text-xs bg-zinc-50/10">-</td>
                          <td className="p-4 font-mono text-zinc-400 text-xs bg-zinc-50/10">-</td>

                          <td className="p-3 bg-zinc-100/20">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                value={item.quantity || ''}
                                onChange={(e) => handleNumberChange(item.id, 'quantity', e.target.value)}
                                className="w-20 text-center font-mono text-sm font-bold border border-zinc-300 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                              />
                            </div>
                          </td>

                          <td className="p-3 bg-zinc-100/40">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                value={item.order_quantity || ''}
                                onChange={(e) => handleNumberChange(item.id, 'order_quantity', e.target.value)}
                                className="w-20 text-center font-mono text-sm font-black border border-black rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                              />
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 💡 แถบท้ายตารางแบบรวมศูนย์ (Unified Table Footer) รวมส่วนลงนามไว้ในนี้สนิทขอบ */}
            <div className="p-4 md:p-5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* ส่วนลงนามฝั่งซ้ายกะทัดรัด */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:max-w-md">
                <label className="flex items-center gap-2 text-xs font-black text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                  <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  ลงนาม (Signature) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="เช่น Apiwat.P"
                  className="w-full font-mono font-bold text-zinc-800 border border-zinc-200 rounded-xl px-4 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all bg-white placeholder:font-sans placeholder:font-normal placeholder:text-zinc-400 text-sm"
                />
              </div>

              {/* ปุ่มส่งเอกสารฝั่งขวา */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-black text-white text-xs font-black shadow-sm hover:bg-zinc-800 active:scale-[0.98] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all duration-150 w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  'ส่งใบจัดทำคำสั่งซื้อย่อย'
                )}
              </button>

            </div>

          </div>
        </form>
      </main>
    </div>
  );
}

const mockMasterItems: OrderItem[] = [
  {
    id: "58b22995-ee3c-4537-a194-b392bfaee481",
    inventory_name: "วัตถุดิบ A",
    supplier_name: "บริษัท เอ จำกัด",
    delivery_when: "EVERY DAY",
    unit: "KG",
    unit_name: "กิโลกรัม",
    quantity: 0,
    order_quantity: 0
  },
  {
    id: "4e44638d-c789-4dae-8c9f-25023af656f5",
    inventory_name: "วัตถุดิบ B",
    supplier_name: "บริษัท เอ จำกัด",
    delivery_when: "EVERY DAY",
    unit: "BOX",
    unit_name: "กล่อง",
    quantity: 0,
    order_quantity: 0
  },
  {
    id: "99b22995-ee3c-4537-a194-b392bfaee111",
    inventory_name: "เหล็กเส้น 12mm",
    supplier_name: "บริษัท ซี สตีล จำกัด",
    delivery_when: "MONDAY",
    unit: "PCS",
    unit_name: "เส้น",
    quantity: 0,
    order_quantity: 0
  }
];