'use client';

import React from 'react';
import { OrderWithItems } from '../page';

interface OrderModalProps {
  order: OrderWithItems | null;
  onClose: () => void;
}

export function OrderModal({ order, onClose }: OrderModalProps) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg md:max-w-2xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* หัวข้อบอกเลขใบ Order หลัก */}
        <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
          <div>
            <h3 className="text-lg font-bold">รายการสินค้าภายในคำสั่งซื้อ</h3>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">ID: {order.id} • ลายเซ็นเอกสาร: {order.signature}</p>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ตารางแจกแจงตัวลูก (Order Items) เน้นดูง่ายตามขนาดหน้าจอ Tablet 7-8 นิ้ว */}
        <div className="p-5 overflow-y-auto flex-1 bg-white">
          <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="p-3">คลังสินค้า (Inventory Name)</th>
                  <th className="p-3 text-center whitespace-nowrap">คงเหลือในระบบ</th>
                  <th className="p-3 text-right whitespace-nowrap">จำนวนที่สั่งซื้อ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                    {/* ชื่อคลัง */}
                    <td className="p-3 font-semibold text-zinc-800">
                      <div className="text-xs text-zinc-400 font-mono font-normal mb-0.5">{item.inventory_id}</div>
                      {item.inventory_name}
                    </td>
                    {/* จำนวนคงเหลือ */}
                    <td className="p-3 text-center font-mono font-medium text-zinc-600 bg-zinc-50/30">
                      {item.quantity.toLocaleString()}
                    </td>
                    {/* จำนวนที่สั่ง */}
                    <td className="p-3 text-right font-mono font-bold text-black text-base">
                      {item.order_quantity.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* บันทึกท้ายเอกสารเพิ่มเติม */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
          <p>สร้างโดย: <strong className="text-zinc-700">{order.created_by}</strong></p>
          {order.is_approve && (
            <p>ผู้อนุมัติ: <strong className="text-zinc-700">{order.approved_by}</strong></p>
          )}
        </div>
        
      </div>
    </div>
  );
}