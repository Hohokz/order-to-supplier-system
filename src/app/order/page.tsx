'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../dashboard/_components/Sidebar';
import { MasterInventoryResponse, MasterInventoryRow } from '../../types/inventory'

export default function OrderPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const router = useRouter();

  type FormItemType = MasterInventoryRow & {
    quantity: number;
    order_quantity: number;
  };

  // สเตตหลักสำหรับจัดการฟอร์มสั่งซื้อ
  const [items, setItems] = useState<FormItemType[]>([]);
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

        const result = await apiClient.post<MasterInventoryResponse[]>('/api/inventories/master', {});
        const targetRows = result[0]?.rows || [];

        // 💡 ปรับปรุงตรงนี้: ทำการ map เพื่อเติมฟิลด์กรอกข้อมูลให้ครบสเปกของ FormItemType ก่อนเซฟลง State
        const itemsWithFormState: FormItemType[] = targetRows.map(row => ({
          ...row,
          quantity: 0,       // เติมค่าเริ่มต้นสำหรับช่องยอดคงเหลือ
          order_quantity: 0  // เติมค่าเริ่มต้นสำหรับช่องจำนวนสั่งซื้อ
        }));

        // 🚀 ยัดตัวแปรที่แปลงโครงสร้างเสร็จแล้วเข้า State ได้อย่างปลอดภัย ไม่ติดแดงแล้วครับ
        setItems(itemsWithFormState);

      } catch (err: unknown) {
        console.error(err);
        setItems(mockMasterItems);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialItems();
  }, [isAuthenticated, isAuthLoading]);

  // จัดกลุ่มไอเทมแยกตามชื่อ Supplier
  const groupedItems = items.reduce((acc, item) => {
    const supplier = item.supplier?.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย';

    if (!acc[supplier]) {
      acc[supplier] = [];
    }

    // 💡 ดัน item เข้าถังสะสมได้เลยทันที ไม่ติดแดงแล้ว เพราะ TypeScript รู้จักทุกฟิลด์เรียบร้อย
    acc[supplier].push(item);

    return acc;
  }, {} as Record<string, FormItemType[]>);

  const supplierNames = Object.keys(groupedItems);

  // เลือกแท็บแรกให้อัตโนมัติเมื่อดึงข้อมูลเสร็จ
  useEffect(() => {
    if (supplierNames.length > 0 && !activeSupplier) {
      setActiveSupplier(supplierNames[0]);
    }
  }, [items, supplierNames, activeSupplier]);

  // ฟังก์ชันดักจับและอัปเดตตัวเลขที่กรอกในฟอร์มแบบรายชิ้น (รองรับทศนิยม)
  // ฟังก์ชันควบคุมการพิมพ์ทศนิยม (การันตีเลข 0 นำหน้า และพิมพ์จุดทศนิยมค้างไว้ได้)
  const handleNumberChange = (itemId: string, field: 'quantity' | 'order_quantity', val: string) => {
    // 1. ล้างตัวอักษรที่ไม่ใช่ตัวเลขหรือจุดทศนิยมออกไป ป้องกันพนักงานพิมพ์ผิด
    let cleanVal = val.replace(/[^0-9.]/g, '');

    // 2. จัดการเรื่องจุดทศนิยมซ้ำ (ให้มีจุดได้แค่จุดเดียว)
    const points = cleanVal.split('.');
    if (points.length > 2) {
      cleanVal = points[0] + '.' + points.slice(1).join('');
    }

    // 3. ถ้าขึ้นต้นด้วยจุด เช่น .5 ให้แปลงเป็น 0.5 อัตโนมัติทันที
    if (cleanVal.startsWith('.')) {
      cleanVal = '0' + cleanVal;
    }

    // 4. บันทึกค่าลงสเตต (ยอมให้ส่ง string เพื่อให้หน้าจอค้างเลข 0 หรือจุดทศนิยมขณะพิมพ์ได้)
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, [field]: cleanVal as unknown } : item
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
      <Sidebar />

      {/* 💡 จุดที่ 1: ปรับลด padding หลักของหน้าจอจาก p-4 เป็น p-3 ในหน้าจอเล็กเพื่อให้เหลือพื้นที่ตารางมากขึ้น */}
      <main className="flex-1 p-3 md:p-8 overflow-y-auto">

        {/* ท่อนหัวข้อ */}
        <div className="mb-6 border-b border-zinc-200 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">จัดทำใบสั่งซื้อวัตถุดิบ</h1>
            <p className="text-xs text-zinc-500 mt-1">ผู้บันทึกรายการ: {user?.username} ({user?.user_role})</p>
          </div>

          {user?.user_role === 'OBSERVER' && (
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 text-xs font-bold shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-95 transition-all duration-150"
            >
              <span>ออกจากระบบ</span>
            </button>
          )}
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-xl text-sm font-bold border ${message.type === 'success' ? 'bg-zinc-900 text-white border-black' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {message.text}
          </div>
        )}

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
            {/* 💡 จุดที่ 2: ปรับลด padding ด้านนอกตารางในหน้าจอเล็กเหลือ p-2 */}
            <div className="p-2 md:p-6">
              <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-600 uppercase text-center">
                        <th className="p-3 text-left min-w-[150px]">ชื่อสินค้า</th>
                        <th className="p-3 whitespace-nowrap bg-zinc-50/30 w-24">2 รอบก่อน</th>
                        <th className="p-3 whitespace-nowrap bg-zinc-50/30 w-24">1 รอบก่อน</th>
                        <th className="p-3 whitespace-nowrap text-zinc-900 bg-zinc-100/40 w-28">คงเหลือ</th>
                        <th className="p-3 whitespace-nowrap text-black font-black bg-zinc-100/80 w-28">สั่งเพิ่ม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {currentItems.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50/30 transition-colors text-center">

                          {/* 📦 ชื่อวัตถุดิบ */}
                          <td className="p-3 font-bold text-zinc-800 text-left">
                            <span className="block truncate max-w-[140px] sm:max-w-none" title={item.inventory_name}>
                              {item.inventory_name}
                            </span>
                            <p className="text-[9px] font-medium text-zinc-400 mt-0.5 font-mono">
                              ID: {item.id.slice(0, 8)}
                            </p>
                          </td>

                          <td className="p-3 font-mono text-zinc-400 text-xs bg-zinc-50/10">-</td>
                          <td className="p-3 font-mono text-zinc-400 text-xs bg-zinc-50/10">-</td>

                          {/* 📊 ช่องกรอกจำนวนคงเหลือ (บีบขนาดเหลือ w-24 กระชับเข้าจอพอดี) */}
                          <td className="p-2 bg-zinc-100/20">
                            <div className="flex items-center justify-center">
                              <div className="flex items-center w-24 h-8 rounded-lg border border-zinc-300 bg-white px-1.5 focus-within:ring-1 focus-within:ring-black">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={item.quantity === 0 ? '' : item.quantity}
                                  onChange={(e) => handleNumberChange(item.id, 'quantity', e.target.value)}
                                  className="w-8 text-center font-mono text-xs font-bold focus:outline-none"
                                />
                                <span className="flex-1 text-right text-[10px] font-bold text-zinc-400 select-none border-l border-zinc-200 pr-0.5 truncate pl-1">
                                  {item.unit?.unit_name || 'หน่วย'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 🛒 ช่องกรอกจำนวนสั่งเพิ่ม (บีบขนาดเหลือ w-24 กระชับเข้าจอพอดี) */}
                          <td className="p-2 bg-zinc-100/40">
                            <div className="flex items-center justify-center">
                              <div className="flex items-center w-24 h-8 rounded-lg border border-black bg-white px-1.5 focus-within:ring-1 focus-within:ring-black">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={item.order_quantity === 0 ? '' : item.order_quantity}
                                  onChange={(e) => handleNumberChange(item.id, 'order_quantity', e.target.value)}
                                  className="w-8 text-center font-mono text-xs font-black focus:outline-none"
                                />
                                <span className="flex-1 text-right text-[10px] font-black text-zinc-900 select-none border-l border-zinc-200 pr-0.5 truncate pl-1">
                                  {item.unit?.unit_name || 'หน่วย'}
                                </span>
                              </div>
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* แถบท้ายตารางรวมศูนย์ */}
            <div className="p-4 md:p-5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:max-w-md">
                <label className="flex items-center gap-2 text-xs font-black text-zinc-500 uppercase tracking-wider whitespace-nowrap">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-black text-white text-xs font-black shadow-sm hover:bg-zinc-800 active:scale-[0.98] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all duration-150 w-full sm:w-auto"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'ส่งใบจัดทำคำสั่งซื้อย่อย'}
              </button>
            </div>

          </div>
        </form>
      </main>
    </div>
  );
}

// 💡 เปลี่ยนชุดข้อมูลจำลองด้านล่างสุดให้ตรงตามสเปกใหม่ของ State
const mockMasterItems: (MasterInventoryRow & { quantity: number; order_quantity: number })[] = [
  {
    id: "58b22995-ee3c-4537-a194-b392bfaee481",
    inventory_name: "วัตถุดิบ A",
    supplier: {
      id: "5f451436-556a-4bd2-b55b-a400a994b447",
      supplier_name: "บริษัท เอ จำกัด"
    },
    unit: {
      id: "KG",
      unit_name: "กิโลกรัม"
    },
    quantity: 0,
    order_quantity: 0
  },
  {
    id: "4e44638d-c789-4dae-8c9f-25023af656f5",
    inventory_name: "วัตถุดิบ B",
    supplier: {
      id: "5f451436-556a-4bd2-b55b-a400a994b447",
      supplier_name: "บริษัท เอ จำกัด"
    },
    unit: {
      id: "BOX",
      unit_name: "กล่อง"
    },
    quantity: 0,
    order_quantity: 0
  },
  {
    id: "99b22995-ee3c-4537-a194-b392bfaee111",
    inventory_name: "เหล็กเส้น 12mm",
    supplier: {
      id: "a307970d-4aa1-4b18-ba78-38f1275a16ed",
      supplier_name: "บริษัท ซี จำกัด"
    },
    unit: {
      id: "PCS",
      unit_name: "เส้น"
    },
    quantity: 0,
    order_quantity: 0
  }
];