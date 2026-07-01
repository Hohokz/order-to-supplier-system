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



  const currentItems = order ? (groupedItems[activeSupplier] || []) : [];
  const tabApprovedBy = currentItems.find(item => item.approve_by)?.approve_by || null;

  // 3. เรียก useEffect ถัดไป
  useEffect(() => {
    const fetchApproverName = async () => {
      if (tabApprovedBy) {
        try {
          const response = await apiClient.get<{ name: string }>(`/api/users/${tabApprovedBy}`);
          setApproverName(response.name);
        } catch (error) {
          const response = await apiClient.get<{ name: string }>(`/api/users/username/${tabApprovedBy}`);
          setApproverName(response.name);
          console.log(error)
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
      <div className="bg-white rounded-2xl w-full max-w-lg md:max-w-5xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]">

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
            const isThisTabApproved = groupedItems[name]?.every(item => item.approve_status === 'APPROVED');
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSupplier(name)}
                className={`px-5 py-3.5 text-xs font-bold whitespace-nowrap min-w-[140px] transition-all focus:outline-none flex items-center justify-center gap-1.5
                  ${isActive ? 'bg-white text-black border-b-2 border-b-black font-black' : 'text-zinc-400 hover:bg-zinc-50'}`}
              >
                <span>{name}</span>
                {isThisTabApproved && <span className="text-[9px] bg-zinc-900 text-white px-1.5 py-0.5 rounded-full font-black scale-90">✓</span>}
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
                  <th className="py-3 px-1 font-medium w-24">3 รอบก่อน</th>
                  <th className="py-3 px-1 font-medium w-24">2 รอบก่อน</th>
                  <th className="py-3 px-1 font-medium w-24">1 รอบก่อน</th>
                  <th className="py-3 px-2 font-medium w-28">คงเหลือ (Safety)</th>
                  <th className="py-3 px-2 font-black w-28">สั่งเพิ่ม</th>
                  <th className="py-3 px-2 font-medium w-24">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {currentItems.map((item) => {
                  const itemData = item as OrderItemWithHistory;

                  const currentCount = Number(itemData.quantity) || 0;
                  const orderCount = Number(itemData.order_quantity) || 0;
                  const safetyLimitNum = Number(itemData.safety_quantity) || 0;
                  const history = itemData.history;

                  const isOrdered = orderCount > 0;
                  const isBelowSafety = currentCount < safetyLimitNum;

                  // 1. ลอจิกสี: ถ้าต่ำกว่า Safety = แดง | ถ้าสั่งของแล้ว = เขียว | อื่นๆ = เทา
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

                  // 2. ลอจิก Disable: ถ้า (ต่ำกว่า Safety AND ไม่ได้สั่ง) -> จางและกดไม่ได้
                  const isDisabled = isBelowSafety && !isOrdered;
                  const disabledStyle = isDisabled ? "opacity-60 pointer-events-none select-none" : "";


                  return (
                    <tr key={item.id} className={`transition-colors text-center ${rowStyle} ${disabledStyle}`}>
                      <td className="py-4 px-2 text-center text-zinc-500 font-mono text-xs">
                        {item.seq}
                      </td>
                      {/* ชื่อสินค้า */}
                      <td className="py-4 px-2 text-left">
                        <div className="font-bold">{itemData.inventory_name}</div>
                        {safetyLimitNum > 0 && <div className="text-[9px] opacity-70">Min: {safetyLimitNum}</div>}
                      </td>

                      {/* Render ประวัติ 3 รอบ */}
                      {[3, 2, 1].map((cycle) => {
                        const stock = history?.[`cycle_${cycle}_stock` as keyof OrderHistory];
                        const order = history?.[`cycle_${cycle}_order` as keyof OrderHistory];
                        return (
                          <td key={cycle} className="py-3 px-1">
                            <div className="flex justify-center">
                              <div className={`flex flex-col w-20 h-10 rounded-xl border border-zinc-200 px-1.5 text-[9px] text-left font-mono ${isBelowSafety ? 'bg-white/50' : 'bg-zinc-50/40'}`}>
                                <div className="truncate">ล: <span className="font-bold">{stock ?? '-'}</span></div>
                                <div className="border-t mt-0.5 pt-0.5 truncate">ส: <span>{order ?? '-'}</span></div>
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-4 px-2 font-mono">{itemData.quantity}</td>
                      <td className="py-4 px-2 font-mono font-black">{isOrdered ? `+${orderCount}` : '0'}</td>
                      <td className="py-4 px-2 text-[9px] font-bold">
                        {itemData.approve_status}
                      </td>
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
            {/* 🚀 ตรวจสอบว่าถ้าอนุมัติแล้ว หรือเป็น Observer ให้ปิดการใช้งานปุ่ม */}
            {isTabApproved ? (
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-400 border border-zinc-200">
                ✓ อนุมัติเรียบร้อยแล้ว
              </span>
            ) : (
              <button
                type="button"
                // 🚀 เพิ่มเงื่อนไข user?.user_role !== 'APPROVER' เพื่อกัน User อื่น
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