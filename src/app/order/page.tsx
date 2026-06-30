'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useModal } from '@/context/ModalContext';
import { Sidebar } from '../dashboard/_components/Sidebar';
import { MasterInventoryRow, MasterInventoryResponse } from '@/types/inventory';

type OrderHistory = {
  cycle_1_stock: number | null;
  cycle_1_order: number | null;
  cycle_2_stock: number | null;
  cycle_2_order: number | null;
  cycle_3_stock: number | null;
  cycle_3_order: number | null;
};

type FormItemType = MasterInventoryRow & {
  quantity: number | string;
  order_quantity: number | string;
  safety_quantity?: number | string;
  history?: OrderHistory;
};

export default function OrderPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const { showError, showSuccess } = useModal();
  const router = useRouter();

  const [items, setItems] = useState<FormItemType[]>([]);
  const [signature, setSignature] = useState<string>('');
  const [activeSupplier, setActiveSupplier] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    const fetchInitialItems = async () => {
      try {
        setIsLoading(true);
        const [masterResult, historyResult] = await Promise.all([
          apiClient.post<MasterInventoryResponse[]>('/api/inventories/master', {}),
          apiClient.get<Record<string, OrderHistory>>('/api/orders/history')
        ]);
        
        const targetRows = masterResult[0]?.rows || [];
        const historyMap = historyResult || {};

        const itemsWithFormState: FormItemType[] = targetRows.map(row => ({
          ...row,
          quantity: '',
          order_quantity: '',
          history: historyMap[row.id] || {
            cycle_1_stock: null, cycle_1_order: null,
            cycle_2_stock: null, cycle_2_order: null,
            cycle_3_stock: null, cycle_3_order: null
          }
        }));

        setItems(itemsWithFormState);
      } catch (err: unknown) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
        showError(errorMessage, 'ไม่สามารถดึงข้อมูลสินค้าได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialItems();
  }, [isAuthenticated, isAuthLoading, showError]);

  const groupedItems = items.reduce((acc, item) => {
    const supplier = item.supplier?.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย';
    if (!acc[supplier]) acc[supplier] = [];
    acc[supplier].push(item);
    return acc;
  }, {} as Record<string, FormItemType[]>);

  const supplierNames = Object.keys(groupedItems);

  useEffect(() => {
    if (supplierNames.length > 0 && !activeSupplier) {
      setActiveSupplier(supplierNames[0]);
    }
  }, [items, supplierNames, activeSupplier]);

  const handleNumberChange = (itemId: string, field: 'quantity' | 'order_quantity', val: string) => {
    let cleanVal = val.replace(/[^0-9.]/g, '');
    const points = cleanVal.split('.');
    if (points.length > 2) {
      cleanVal = points[0] + '.' + points.slice(1).join('');
    }
    if (cleanVal.startsWith('.')) {
      cleanVal = '0' + cleanVal;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, [field]: cleanVal } : item
      )
    );
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!signature.trim()) {
      const text = 'กรุณากรอกชื่อผู้ลงนาม (Signature) ก่อนส่งเอกสาร';
      setMessage({ type: 'error', text });
      showError(text, 'ข้อมูลไม่ครบถ้วน');
      return;
    }

    const filteredItems = items.filter((item) => {
      const orderNum = Number(item.order_quantity);
      return !isNaN(orderNum) && orderNum > 0;
    });

    if (filteredItems.length === 0) {
      const text = 'กรุณากรอกจำนวนที่ต้องการสั่งเพิ่มอย่างน้อย 1 รายการ';
      setMessage({ type: 'error', text });
      showError(text, 'ข้อมูลไม่ถูกต้อง');
      return;
    }

    const hasInvalidQuantity = filteredItems.some((item) => {
      const currentQty = Number(item.quantity);
      return isNaN(currentQty) || currentQty < 0;
    });

    if (hasInvalidQuantity) {
      const text = 'ทุกรายการที่สั่งซื้อ จะต้องระบุจำนวน "คงเหลือ" อย่างน้อย 1 ขึ้นไปตามกฎของระบบครับ';
      setMessage({ type: 'error', text });
      showError(text, 'ยอดคงเหลือไม่ถูกต้องตามกฎระบบ');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        signature: signature.trim(),
        items: filteredItems.map(item => ({
          inventory_id: item.id,
          quantity: Number(item.quantity),
          order_quantity: Number(item.order_quantity),
          delivery_when: 'IMMEDIATE'
        }))
      };

      await apiClient.post('/api/orders', payload);

      const successText = 'ส่งใบจัดทำคำสั่งซื้อเข้าสู่ระบบสำเร็จแล้ว!';
      setMessage({ type: 'success', text: successText });
      showSuccess(successText);
      setSignature('');
      setItems(prev => prev.map(item => ({ ...item, quantity: '', order_quantity: '' })));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setMessage({ type: 'error', text: errorMessage });
      showError(errorMessage, 'ไม่สามารถบันทึกคำสั่งซื้อได้');
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

      <main className="flex-1 p-3 md:p-8 overflow-y-auto">
        <div className="mb-6 border-b border-zinc-200 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">จัดทำใบสั่งซื้อวัตถุดิบ</h1>
            <p className="text-xs text-zinc-500 mt-1">ผู้บันทึกรายการ: {user?.username} ({user?.user_role})</p>
          </div>

          {user?.user_role === 'OBSERVER' && (
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-5 py-2 rounded-full border border-zinc-200 bg-white text-zinc-600 text-xs font-bold shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
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

            <div className="bg-zinc-50/50 border-b border-zinc-200 flex items-center overflow-x-auto scrollbar-none divide-x divide-zinc-100">
              {supplierNames.map((name) => {
                const isActive = activeSupplier === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveSupplier(name)}
                    className={`px-6 py-4 text-sm font-bold text-center whitespace-nowrap min-w-[140px] transition-all focus:outline-none
                      ${isActive ? 'bg-white text-black border-b-2 border-b-black font-black' : 'text-zinc-400 hover:bg-zinc-50'}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            <div className="p-2 md:p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 text-xs uppercase text-center">
                      <th className="py-4 px-2 text-left font-medium min-w-[150px]">ชื่อสินค้า</th>
                      <th className="py-4 px-2 font-medium w-24">3 รอบก่อน</th>
                      <th className="py-4 px-2 font-medium w-24">2 รอบก่อน</th>
                      <th className="py-4 px-2 font-medium w-24">1 รอบก่อน</th>
                      <th className="py-4 px-2 font-medium text-zinc-900 w-28">คงเหลือ *</th>
                      <th className="py-4 px-2 font-black text-black w-28">สั่งเพิ่ม *</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-800">
                    {currentItems.map((item) => {
                      const currentCount = Number(item.quantity);

                      const safetyLimitNum = typeof item.safety_quantity === 'number'
                        ? item.safety_quantity
                        : Number(item.safety_quantity) || 0;

                      const hasInputtedStock = item.quantity !== '';
                      const isBelowSafety = !isNaN(currentCount) && currentCount < safetyLimitNum;

                      let rowBgClass = "hover:bg-zinc-50/50";
                      if (hasInputtedStock && isBelowSafety) {
                        rowBgClass = "bg-red-50/60 hover:bg-red-50/80 text-red-950 border-red-100 transition-colors";
                      }

                      const unitStr = item.unit?.unit_name || 'หน่วย';

                      return (
                        <tr key={item.id} className={`transition-colors text-center ${rowBgClass}`}>
                          <td className="py-4 px-2 font-bold text-zinc-900 text-left">
                            <span className="block truncate max-w-[140px] sm:max-w-none" title={item.inventory_name}>
                              {item.inventory_name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-medium text-zinc-400 font-mono">
                              <span>ID: {item.id.slice(0, 8).toUpperCase()}</span>
                              {safetyLimitNum > 0 && (
                                <span className={`px-1 rounded-sm font-sans scale-90 origin-left font-bold ${isBelowSafety ? 'bg-red-200 text-red-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                  Min: {safetyLimitNum}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3 รอบก่อน */}
                          <td className="py-3 px-1">
                            <div className="flex items-center justify-center">
                              <div className="flex flex-col justify-center w-24 h-10 rounded-xl border border-zinc-200 bg-zinc-50/40 px-1.5 text-[10px] text-left font-mono opacity-75">
                                <div className="text-zinc-400 truncate">เหลือ: <span className="text-zinc-600 font-bold">{item.history?.cycle_3_stock !== null ? `${item.history?.cycle_3_stock} ${unitStr}` : '-'}</span></div>
                                <div className="text-zinc-400 border-t border-zinc-200/60 mt-0.5 pt-0.5 truncate">สั่ง: <span className="text-zinc-500 font-medium">{item.history?.cycle_3_order !== null ? `+${item.history?.cycle_3_order} ${unitStr}` : '-'}</span></div>
                              </div>
                            </div>
                          </td>

                          {/* 2 รอบก่อน */}
                          <td className="py-3 px-1">
                            <div className="flex items-center justify-center">
                              <div className="flex flex-col justify-center w-24 h-10 rounded-xl border border-zinc-200 bg-zinc-50/40 px-1.5 text-[10px] text-left font-mono opacity-75">
                                <div className="text-zinc-400 truncate">เหลือ: <span className="text-zinc-600 font-bold">{item.history?.cycle_2_stock !== null ? `${item.history?.cycle_2_stock} ${unitStr}` : '-'}</span></div>
                                <div className="text-zinc-400 border-t border-zinc-200/60 mt-0.5 pt-0.5 truncate">สั่ง: <span className="text-zinc-500 font-medium">{item.history?.cycle_2_order !== null ? `+${item.history?.cycle_2_order} ${unitStr}` : '-'}</span></div>
                              </div>
                            </div>
                          </td>

                          {/* 1 รอบก่อน */}
                          <td className="py-3 px-1">
                            <div className="flex items-center justify-center">
                              <div className="flex flex-col justify-center w-24 h-10 rounded-xl border border-zinc-200 bg-zinc-50/60 px-1.5 text-[10px] text-left font-mono opacity-90 ring-1 ring-zinc-100">
                                <div className="text-zinc-500 truncate">เหลือ: <span className="text-zinc-700 font-bold">{item.history?.cycle_1_stock !== null ? `${item.history?.cycle_1_stock} ${unitStr}` : '-'}</span></div>
                                <div className="text-zinc-400 border-t border-zinc-200/60 mt-0.5 pt-0.5 truncate">สั่ง: <span className="text-emerald-600 font-black">{item.history?.cycle_1_order !== null ? `+${item.history?.cycle_1_order} ${unitStr}` : '-'}</span></div>
                              </div>
                            </div>
                          </td>

                          {/* คงเหลือ */}
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center">
                              <div className={`flex items-center w-24 h-8 rounded-xl border bg-white px-2 focus-within:border-black transition-all ${hasInputtedStock && isBelowSafety ? 'border-red-400 ring-1 ring-red-400' : 'border-zinc-200'}`}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={item.quantity}
                                  onChange={(e) => handleNumberChange(item.id, 'quantity', e.target.value)}
                                  className="w-full text-center font-mono text-xs font-bold focus:outline-none bg-transparent"
                                />
                                <span className="text-[10px] font-bold text-zinc-400 select-none border-l border-zinc-100 pl-1.5 truncate">
                                  {unitStr}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* สั่งเพิ่ม */}
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center">
                              <div className="flex items-center w-24 h-8 rounded-xl border border-black bg-white px-2 focus-within:ring-1 focus-within:ring-black transition-all">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={item.order_quantity}
                                  onChange={(e) => handleNumberChange(item.id, 'order_quantity', e.target.value)}
                                  className="w-full text-center font-mono text-xs font-black focus:outline-none bg-transparent"
                                />
                                <span className="text-[10px] font-black text-black select-none border-l border-zinc-200 pl-1.5 truncate">
                                  {unitStr}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 md:p-5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:max-w-md">
                <label className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                  ลงนาม (Signature) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="เช่น Apiwat.P"
                  className="w-full font-mono font-bold text-zinc-800 border border-zinc-200 rounded-full px-4 py-2 focus:outline-none focus:border-black transition-all bg-white placeholder:font-sans placeholder:font-normal placeholder:text-zinc-400 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-black text-white text-xs font-black shadow-sm hover:bg-zinc-800 active:scale-[0.98] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all w-full sm:w-auto"
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