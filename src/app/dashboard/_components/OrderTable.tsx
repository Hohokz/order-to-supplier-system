'use client';

import React from 'react';
import { OrderWithItems } from '../page';

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
      <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">{error}</div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-100/70 border-b border-zinc-200 text-xs font-bold text-zinc-600 uppercase tracking-wider">
              <th className="p-4 md:p-5">วันที่สั่งซื้อ</th>
              <th className="p-4 md:p-5">ID / ลายเซ็น</th>
              <th className="p-4 md:p-5">ผู้สร้างเอกสาร</th>
              <th className="p-4 md:p-5 text-right">สถานะอนุมัติ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-sm">
            {orders.map((order) => (
              <tr 
                key={order.id}
                onClick={() => onOrderClick(order)}
                className="hover:bg-zinc-50 cursor-pointer active:bg-zinc-100 transition-colors duration-150"
              >
                <td className="p-4 md:p-5 whitespace-nowrap font-medium">
                  {new Date(order.order_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="p-4 md:p-5 font-mono">
                  <span className="text-zinc-400 text-xs mr-1">#{order.id}</span>
                  <span className="font-bold text-zinc-800">{order.signature || 'N/A'}</span>
                </td>
                <td className="p-4 md:p-5 text-zinc-600 font-medium">{order.created_by}</td>
                <td className="p-4 md:p-5 text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                    order.is_approve 
                      ? 'bg-zinc-900 text-white border-black' 
                      : 'bg-white text-zinc-500 border-zinc-200'
                  }`}>
                    {order.is_approve ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}