'use client';

import React, { useState, useEffect } from 'react';
import { OrderWithItems, OrderItem } from '@/types/order';
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

  if (!order) return null;

  const currentItems = groupedItems[activeSupplier] || [];
  const currentSupplierId = currentItems[0]?.supplier_id;
  const isTabApproved = currentItems.length > 0 && currentItems.every(item => item.approve_status === 'APPROVED');
  const tabApprovedBy = currentItems.find(item => item.approve_by)?.approve_by || null;

  const handleApproveClick = async () => {
    if (!currentSupplierId) {
      alert("❌ ไม่สามารถอนุมัติได้: รายการนี้ไม่มี Supplier ID (อาจเป็นออเดอร์เก่าระบบเดิม ให้ทดลองสร้างออเดอร์ใหม่เพื่อทดสอบครับ)");
      return;
    }

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
      <div className="bg-white rounded-2xl w-full max-w-lg md:max-w-4xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]">

        {/* หัวข้อ Modal */}
        <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h3 className="text-sm font-black text-zinc-900">ตรวจสอบรายการสั่งซื้อแยกซัพพลายเออร์</h3>
            <p className="text-[10px] font-mono text-zinc-400 mt-0.5">ID บิลหลัก: #{order.id} • ลายเซ็นผู้จัดทำ: {order.signature}</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full hover:bg-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black transition-colors text-xs font-bold">✕</button>
        </div>

        {/* แถบเลือกรายชื่อ Supplier */}
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

        {/* ตารางสินค้า */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-400 text-center">
                  <th className="py-3 px-2 text-left font-medium min-w-[180px]">ชื่อสินค้าวัตถุดิบ</th>
                  <th className="py-3 px-2 font-medium w-24">2 รอบก่อนหน้า</th>
                  <th className="py-3 px-2 font-medium w-24">1 รอบก่อนหน้า</th>
                  <th className="py-3 px-2 font-medium w-28">คงเหลือ (Safety)</th>
                  <th className="py-3 px-2 font-black w-28">สั่งเพิ่ม</th>
                  <th className="py-3 px-2 font-medium w-24">สถานะชิ้นนี้</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {currentItems.map((item) => {
                  // 🚀 ประกาศตัวแปรทั้งหมดไว้ใน Scope นี้เพื่อให้เรียกใช้ได้ทุกบรรทัด
                  const currentCount = Number(item.quantity) || 0;
                  const orderCount = Number(item.order_quantity) || 0; // ต้องมีบรรทัดนี้ครับ
                  const safetyLimitNum = Number(item.safety_quantity) || 0;

                  const isOrdered = orderCount > 0;
                  const isBelowSafety = currentCount < safetyLimitNum;

                  // 🔴 ลอจิกสี: แดงต้องมาก่อนเขียวเสมอตามที่คุยกันไว้
                  let rowStyle = "";
                  let textMainColor = "text-zinc-900";
                  let textSubColor = "text-zinc-500";

                  if (isBelowSafety) {
                    rowStyle = "bg-red-50/80 text-red-900/40 border-red-100";
                    textMainColor = "text-red-700/80 font-bold";
                    textSubColor = "text-red-500/60";
                  } else if (isOrdered) {
                    rowStyle = "bg-emerald-50/60 text-emerald-950 border-emerald-100 hover:bg-emerald-50 transition-colors";
                    textMainColor = "text-emerald-900 font-bold";
                    textSubColor = "text-emerald-700 font-semibold";
                  } else {
                    rowStyle = "bg-zinc-50/70 text-zinc-400 border-zinc-200 pointer-events-none select-none opacity-60";
                    textMainColor = "text-zinc-400";
                    textSubColor = "text-zinc-400/70";
                  }

                  return (
                    <tr key={item.id} className={`transition-colors text-center ${rowStyle}`}>
                      <td className={`py-4 px-2 text-left ${textMainColor}`}>{item.inventory_name}</td>
                      <td className="py-4 px-2 opacity-30 font-mono">-</td>
                      <td className="py-4 px-2 opacity-30 font-mono">-</td>

                      <td className={`py-4 px-2 font-mono ${textSubColor}`}>
                        {item.quantity.toLocaleString()} {item.unit_name}
                        <span className="text-[10px] block opacity-70">
                          (Min: {safetyLimitNum.toLocaleString()})
                        </span>
                      </td>

                      <td className="py-4 px-2 font-mono text-sm font-black">
                        {isOrdered ? `+${orderCount.toLocaleString()}` : '0'} {item.unit_name}
                      </td>

                      <td className="py-4 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono 
            ${item.approve_status === 'APPROVED' ? 'bg-zinc-900 text-white' :
                            item.approve_status === 'NOT_ORDERED' ? 'bg-zinc-200 text-zinc-500' : 'bg-amber-100 text-amber-700'}`}>
                          {item.approve_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ท้าย Modal */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
          <div className="text-[10px] text-zinc-400 font-medium space-y-0.5">
            <p>ผู้จัดทำคำสั่งซื้อ: <strong className="text-zinc-700">{order.created_by}</strong></p>
            {isTabApproved && <p>ผู้อนุมัติ (เฉพาะเจ้านี้): <strong className="text-zinc-700">{tabApprovedBy || 'Authorized'}</strong></p>}
          </div>

          <div>
            {isTabApproved ? (
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-400 border border-zinc-200">
                ✓ เจ้านี้อนุมัติเรียบร้อยแล้ว
              </span>
            ) : (
              <button
                type="button"
                disabled={isApproving || user?.user_role !== 'APPROVER'}
                onClick={handleApproveClick}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-black text-white text-xs font-bold shadow-sm hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all"
              >
                {isApproving ? 'กำลังบันทึก...' : user?.user_role !== 'APPROVER' ? 'ไม่มีสิทธิ์อนุมัติ' : `อนุมัติใบสั่งซื้อเฉพาะของ ${activeSupplier}`}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}