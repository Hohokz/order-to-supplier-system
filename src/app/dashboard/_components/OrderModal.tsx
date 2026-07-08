'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { OrderWithItems, OrderItem, OrderItemWithHistory, OrderHistory } from '@/types/order';
import { useAuth } from '@/context/AuthContext';

interface OrderModalProps {
  order: OrderWithItems | null;
  onClose: () => void;
  onApprove: (orderId: number, supplierId: string) => Promise<void>;
}

export function OrderModal({ order, onClose, onApprove }: OrderModalProps) {
  const { user } = useAuth();
  const [activeSupplier, setActiveSupplier] = useState<string>('');
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approverName, setApproverName] = useState<string | null>(null);

  const groupedItems = order
    ? order.items.reduce((acc, item) => {
      const supplier = item.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย';
      if (!acc[supplier]) acc[supplier] = [];
      acc[supplier].push(item);
      return acc;
    }, {} as Record<string, OrderItem[]>)
    : {};

  const supplierNames = Object.keys(groupedItems);

  useEffect(() => {
    if (order && order.items && order.items.length > 0) {
      const firstSupplier = order.items[0]?.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย';
      setActiveSupplier(firstSupplier);
    }
  }, [order]);

  const currentItems = (order ? (groupedItems[activeSupplier] || []) : []) as OrderItemWithHistory[];

  const cycle1Date = currentItems.find(item => (item as OrderItemWithHistory).history?.cycle_1_date)?.history?.cycle_1_date;
  const cycle2Date = currentItems.find(item => (item as OrderItemWithHistory).history?.cycle_2_date)?.history?.cycle_2_date;
  const cycle3Date = currentItems.find(item => (item as OrderItemWithHistory).history?.cycle_3_date)?.history?.cycle_3_date;

  const tabApprovedBy = currentItems.find(item => item.approve_by)?.approve_by || null;

  useEffect(() => {
    const fetchApproverName = async () => {
      if (tabApprovedBy) {
        try {
          const response = await apiClient.get<{ name: string }>(`/api/users/${tabApprovedBy}`);
          setApproverName(response.name);
        } catch (error) {
          try {
            const response = await apiClient.get<{ name: string }>(`/api/users/username/${tabApprovedBy}`);
            setApproverName(response.name);
          } catch (err) {
            console.error(err);
          }
          console.log(error);
        }
      } else {
        setApproverName(null);
      }
    };
    fetchApproverName();
  }, [tabApprovedBy]);

  const currentSupplierId = currentItems[0]?.supplier_id;
  const orderedItems = currentItems.filter(item => Number(item.order_quantity) > 0);
  const isTabApproved = orderedItems.length > 0 && orderedItems.every(item => item.approve_status === 'APPROVED');

  if (!order) return null;

  const handleApproveClick = async () => {
    if (!currentSupplierId) return;
    if (isApproving) return;

    try {
      setIsApproving(true);
      await onApprove(order.id, currentSupplierId);
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg md:max-w-6xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]">

        <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h3 className="text-sm font-black text-zinc-900">ตรวจสอบรายการสั่งซื้อแยกซัพพลายเออร์</h3>
            <p className="text-[10px] font-mono text-zinc-400 mt-0.5">ID บิลหลัก: #{order.id} • ลายเซ็นผู้จัดทำ: {order.signature}</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full hover:bg-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black transition-colors text-xs font-bold">✕</button>
        </div>

        <div className="bg-zinc-50/20 border-b border-zinc-200 flex items-center overflow-x-auto scrollbar-none divide-x divide-zinc-100">
          {supplierNames.map((name) => {
            const isActive = activeSupplier === name;
            const itemsForThisSupplier = groupedItems[name] || [];
            const relevantItems = itemsForThisSupplier.filter(item => item.approve_status !== 'NOT_ORDERED');
            const isThisTabApproved = relevantItems.length > 0 &&
              relevantItems.every(item => item.approve_status === 'APPROVED');

            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSupplier(name)}
                className={`px-5 py-3.5 text-xs font-bold whitespace-nowrap min-w-[140px] transition-all focus:outline-none flex items-center justify-center gap-1.5
        ${isActive ? 'bg-white text-black border-b-2 border-b-black font-black' : 'text-zinc-400 hover:bg-zinc-50'}`}
              >
                <span>{name}</span>
                {isThisTabApproved && (
                  <span className="text-[9px] bg-zinc-900 text-white px-1.5 py-0.5 rounded-full font-black scale-90">✓</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-400 text-center">
                  <th className="py-4 px-2 font-medium w-12">ลำดับ</th>
                  <th className="py-3 px-2 text-left font-medium min-w-[180px]">ชื่อสินค้าวัตถุดิบ</th>
                  <th className="py-3 px-2 font-black min-w-[90px]">สั่งเพิ่ม</th>
                  <th className="py-3 px-2 font-medium min-w-[90px]">คงเหลือ</th>
                  <th className="py-3 px-1 font-medium w-28">
                    <div>1 รอบก่อน</div>
                    {cycle1Date && (
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5 font-normal whitespace-nowrap">
                        ({new Date(cycle1Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })})
                      </div>
                    )}
                  </th>
                  <th className="py-3 px-1 font-medium w-28">
                    <div>2 รอบก่อน</div>
                    {cycle2Date && (
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5 font-normal whitespace-nowrap">
                        ({new Date(cycle2Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })})
                      </div>
                    )}
                  </th>
                  <th className="py-3 px-1 font-medium w-28 hidden md:table-cell">
                    <div>3 รอบก่อน</div>
                    {cycle3Date && (
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5 font-normal whitespace-nowrap">
                        ({new Date(cycle3Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })})
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {currentItems.map((item) => {
                  const itemData = item as OrderItemWithHistory & {
                    unit_name?: string;
                    quantity_unit?: string | null;
                    order_unit?: string | null;
                  };

                  const currentCount = Number(itemData.quantity) || 0;
                  const orderCount = Number(itemData.order_quantity) || 0;
                  const safetyLimitNum = Number(itemData.safety_quantity) || 0;
                  const history = itemData.history;

                  const displayQuantityUnit = itemData.quantity_unit || itemData.unit_name || '';
                  const displayOrderUnit = itemData.order_unit || itemData.unit_name || '';

                  const isOrdered = orderCount > 0;
                  const isBelowSafety = currentCount < safetyLimitNum;

                  let rowStyle = "";
                  if (isOrdered && isBelowSafety) {
                    rowStyle = "bg-red-50/80 text-red-900 border-red-100";
                  } else if (isOrdered) {
                    rowStyle = "bg-emerald-50/60 text-emerald-950 border-emerald-100";
                  } else if (isBelowSafety) {
                    rowStyle = "bg-red-50/80 text-red-900/40 border-red-100";
                  } else {
                    rowStyle = "bg-zinc-50/70 text-zinc-400 border-zinc-200";
                  }

                  const isDisabled = isBelowSafety && !isOrdered;
                  const disabledStyle = isDisabled ? "opacity-60 pointer-events-none select-none" : "";

                  return (
                    <tr key={item.id} className={`transition-colors text-center ${rowStyle} ${disabledStyle}`}>
                      <td className="py-4 px-2 text-center text-zinc-500 font-mono text-xs">
                        {item.seq}
                      </td>
                      <td className="py-4 px-2 text-left">
                        <div className="font-bold">{itemData.inventory_name}</div>
                      </td>

                      <td className="py-4 px-2 font-mono font-black">
                        {isOrdered ? `+${orderCount}` : '0'}
                        {displayOrderUnit && <span className="ml-1 text-[10px] font-sans font-normal opacity-70">{displayOrderUnit}</span>}
                      </td>

                      <td className="py-4 px-2 font-mono">
                        {itemData.quantity}
                        {displayQuantityUnit && <span className="ml-1 text-[10px] font-sans font-normal opacity-70">{displayQuantityUnit}</span>}
                      </td>

                      {/* 💡 3. แสดงประวัติ 3 รอบย้อนหลัง ดึงหน่วยนับของอดีตมาใช้ตรงๆ ไร้ any */}
                      {[3, 2, 1].map((cycle) => {
                        // Cast type อย่างปลอดภัยเพื่อป้องกัน TS Error กรณีที่ types/order.ts ยังไม่มีฟิลด์เหล่านี้
                        const safeHistory = history as Record<string, string | number | null | undefined> | undefined;

                        const stock = safeHistory?.[`cycle_${cycle}_stock`];
                        const order = safeHistory?.[`cycle_${cycle}_order`];

                        const histQuantityUnit = safeHistory?.[`cycle_${cycle}_quantity_unit`] as string | null | undefined;
                        const histOrderUnit = safeHistory?.[`cycle_${cycle}_order_unit`] as string | null | undefined;

                        // ถ้าไม่มีเก็บไว้ในอดีต ให้ใช้หน่วยหลัก (unit_name) แทน
                        const displayHistQuantityUnit = histQuantityUnit || itemData.unit_name || '';
                        const displayHistOrderUnit = histOrderUnit || itemData.unit_name || '';

                        return (
                          <td
                            key={cycle}
                            className={`py-3 px-1 ${cycle === 3 ? 'hidden md:table-cell' : ''}`}
                          >
                            <div className="flex justify-center">
                              <div className={`flex flex-col w-24 rounded-xl border border-zinc-200 px-2 py-1.5 text-[9px] text-left font-mono ${isBelowSafety ? 'bg-white/50' : 'bg-zinc-50/40'}`}>
                                <div className="truncate">
                                  คงเหลือ: <span className="font-bold">{stock !== null && stock !== undefined ? String(stock) : '-'}</span>
                                  {stock !== null && stock !== undefined && displayHistQuantityUnit && <span className="font-sans opacity-70 ml-0.5">{displayHistQuantityUnit}</span>}
                                </div>
                                <div className="border-t mt-0.5 pt-0.5 truncate">
                                  สั่งเพิ่ม: <span>{order !== null && order !== undefined ? String(order) : '-'}</span>
                                  {order !== null && order !== undefined && displayHistOrderUnit && <span className="font-sans opacity-70 ml-0.5">{displayHistOrderUnit}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
          <div className="text-[10px] text-zinc-400 font-medium space-y-0.5">
            <p>ผู้จัดทำคำสั่งซื้อ: <strong className="text-zinc-700">{order.signature}</strong></p>
            {isTabApproved && <p>ผู้อนุมัติ (เฉพาะเจ้านี้): <strong className="text-zinc-700">{approverName || tabApprovedBy}</strong></p>}
          </div>

          <div>
            {isTabApproved ? (
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-400 border border-zinc-200">
                ✓ อนุมัติเรียบร้อยแล้ว
              </span>
            ) : (
              <button
                type="button"
                disabled={isApproving || user?.user_role !== 'APPROVER'}
                onClick={handleApproveClick}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-black text-white text-xs font-bold shadow-sm hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all"
              >
                {isApproving ? 'กำลังอนุมัติ...' : 'อนุมัติใบสั่งซื้อเฉพาะของ ' + activeSupplier}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}