'use client';

import React, { useState, useEffect } from 'react';
import { OrderWithItems, OrderItem } from '@/types/order';
import { useAuth } from '@/context/AuthContext'; // 💡 เรียกใช้เพื่อตรวจสิทธิ์คนกด

interface OrderModalProps {
  order: OrderWithItems | null;
  onClose: () => void;
  onApprove: (orderId: string) => Promise<void>; // 💡 เพิ่มฟังก์ชันอนุมัติเข้ามาใน Props
}

export function OrderModal({ order, onClose, onApprove }: OrderModalProps) {
  const { user } = useAuth();
  const [activeSupplier, setActiveSupplier] = useState<string>('');
  const [isApproving, setIsApproving] = useState<boolean>(false); // สเตตรอโหลดตอนกดอนุมัติ

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

  // ลอจิกควบคุมการกดปุ่มอนุมัติ
  const handleApproveClick = async () => {
    if (isApproving) return;
    try {
      setIsApproving(true);
      await onApprove(order.id); // ส่ง ID ไปให้หลังบ้านประมวลผล
    } catch (error) {
      console.error(error);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg md:max-w-4xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* ส่วนหัวป๊อปอัป */}
        <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
          <div>
            <h3 className="text-lg font-bold">ตรวจสอบรายการสั่งซื้อย่อย</h3>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">ID: #{order.id} • ลายเซ็น: {order.signature}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors font-bold">✕</button>
        </div>

        {/* แถบเลือกรายชื่อ Supplier */}
        <div className="bg-zinc-50/50 border-b border-zinc-200 flex items-center overflow-x-auto divide-x divide-zinc-200">
          {supplierNames.map((name) => {
            const isActive = activeSupplier === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSupplier(name)}
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap min-w-[140px] transition-all
                  ${isActive ? 'bg-white text-black border-b-4 border-b-black font-black' : 'text-zinc-500 hover:bg-zinc-100/50'}`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* ส่วนตารางข้อมูลสินค้า */}
        <div className="p-5 overflow-y-auto flex-1 bg-white">
          <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-600 text-center">
                    <th className="p-4 text-left min-w-[180px]">ชื่อสินค้า</th>
                    <th className="p-4 bg-zinc-50/30">2 รอบก่อนหน้า</th>
                    <th className="p-4 bg-zinc-50/30">1 รอบก่อนหน้า</th>
                    <th className="p-4 text-zinc-900 bg-zinc-100/20">คงเหลือ</th>
                    <th className="p-4 text-black font-black bg-zinc-100/40">สั่งเพิ่ม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors text-center">
                      <td className="p-4 font-bold text-zinc-800 text-left">{item.inventory_name}</td>
                      <td className="p-4 text-zinc-400 text-xs bg-zinc-50/10">-</td>
                      <td className="p-4 text-zinc-400 text-xs bg-zinc-50/10">-</td>
                      <td className="p-4 font-mono font-semibold text-zinc-600 bg-zinc-100/20">{item.quantity.toLocaleString()} {item.unit_name}</td>
                      <td className="p-4 font-mono font-black text-black text-base bg-zinc-100/40">+{item.order_quantity.toLocaleString()} {item.unit_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 💡 5. ส่วนท้ายแผ่นป๊อปอัป: ปรับปรุงให้มีปุ่มกดอนุมัติสไตล์โมเดิร์น */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center">
          <div className="text-xs text-zinc-400 font-medium">
            <p>ผู้สร้างเอกสาร: <strong className="text-zinc-600">{order.created_by}</strong></p>
            {order.is_approve && <p>ผู้อนุมัติ: <strong className="text-zinc-600">{order.approved_by}</strong></p>}
          </div>

          <div>
            {order.is_approve ? (
              /* ถ้าระบบได้รับการอนุมัติแล้ว จะแสดงป้ายสถานะล็อกตายตัว */
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-200 text-zinc-700 border border-zinc-300">
                ✓ ผ่านการอนุมัติแล้ว
              </span>
            ) : (
              /* ถ้าสิทธิ์ยังคงเป็นเท็จ (false) จะเปิดสวิตช์ปุ่มกดอนุมัติสีดำดุดัน */
              <button
                type="button"
                disabled={isApproving || user?.user_role !== 'APPROVER'} 
                onClick={handleApproveClick}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-black shadow-md hover:bg-zinc-800 active:bg-zinc-900 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed transition-all duration-150"
              >
                {isApproving ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : user?.user_role !== 'APPROVER' ? (
                  'ไม่มีสิทธิ์อนุมัติ'
                ) : (
                  'อนุมัติคำสั่งซื้อนี้'
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}