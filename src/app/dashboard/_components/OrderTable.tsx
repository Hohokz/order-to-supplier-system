'use client';

import React from 'react';
import { OrderWithItems } from '@/types/order';

interface OrderTableProps {
  orders: OrderWithItems[];
  isLoading: boolean;
  error: string;
  onOrderClick: (order: OrderWithItems) => void;
}

export function OrderTable({ orders, isLoading, error, onOrderClick }: OrderTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin h-7 w-7 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100">{error}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          {/* 💡 เปลี่ยนสีหัวข้อให้เป็นแบบใส Clean UI ไม่ใช้เทาทึบ */}
          <tr className="border-b border-zinc-200 text-zinc-400 text-xs uppercase font-medium">
            <th className="py-4 px-2">วันที่สั่งซื้อ</th>
            <th className="py-4 px-2">ID / ลายเซ็นผู้จัดทำ</th>
            <th className="py-4 px-2">ผู้บันทึกเอกสาร</th>
            <th className="py-4 px-2 text-right">สถานะอนุมัติ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
          {orders.map((order) => (
            <tr
              key={order.id}
              onClick={() => onOrderClick(order)}
              className="hover:bg-zinc-50/50 cursor-pointer transition-colors"
            >
              <td className="py-4 px-2 font-mono text-zinc-500">
                {new Date(order.order_date || order.created_date).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </td>
              <td className="py-4 px-2 font-mono">
                <span className="text-zinc-300 text-[10px] mr-1">#{order.id}</span>
                <span className="font-bold text-zinc-900">{order.signature || 'N/A'}</span>
              </td>
              <td className="py-4 px-2 text-zinc-600 font-semibold">{order.created_by}</td>
              <td className="py-4 px-2 text-right">
                {/* 💡 Badge สถานะแคปซูลทรงมนกลมสมส่วน */}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black border font-mono transition-all
                  ${order.is_approve
                    ? 'bg-zinc-900 text-white border-black'
                    : 'bg-white text-zinc-400 border-zinc-200'
                  }`}>
                  {order.is_approve ? 'APPROVED' : 'PENDING'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}