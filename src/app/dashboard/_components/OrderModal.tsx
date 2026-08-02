'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { OrderWithItems, OrderItem, OrderItemWithHistory } from '@/types/order';
import { useAuth } from '@/context/AuthContext';

interface OrderModalProps {
  order: OrderWithItems | null;
  onClose: () => void;
  onApprove: (orderId: number, supplierId: string) => Promise<void>;
}

interface OrderItemWithDisplay extends OrderItem {
  displaySeq: number;
}

export function OrderModal({ order, onClose, onApprove }: OrderModalProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isOpenOrderView = searchParams.has('openOrder');
  const [activeSupplier, setActiveSupplier] = useState<string>('');
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approverName, setApproverName] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const [historyDates, setHistoryDates] = useState<{
    cycle_1_date: string | null;
    cycle_2_date: string | null;
    cycle_3_date: string | null;
  }>({ cycle_1_date: null, cycle_2_date: null, cycle_3_date: null });

  const groupedItems = order
    ? order.items.reduce((acc, item) => {
      const supplier = item.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย';
      if (!acc[supplier]) acc[supplier] = [];
      acc[supplier].push(item);
      return acc;
    }, {} as Record<string, OrderItem[]>)
    : {};

  const processedItems: Record<string, OrderItemWithDisplay[]> = {};

  Object.keys(groupedItems).forEach((supplier) => {
    const sorted = [...groupedItems[supplier]].sort((a, b) => {
      const aSeq = a.order_seq ?? a.seq;
      const bSeq = b.order_seq ?? b.seq;
      if (aSeq !== bSeq) return aSeq - bSeq;

      const aHasOrderSeq = a.order_seq !== undefined && a.order_seq !== null;
      const bHasOrderSeq = b.order_seq !== undefined && b.order_seq !== null;
      if (aHasOrderSeq && !bHasOrderSeq) return -1;
      if (!aHasOrderSeq && bHasOrderSeq) return 1;
      return 0;
    });
    processedItems[supplier] = sorted.map((item, index) => ({
      ...item,
      displaySeq: index + 1
    }));
  });
  const supplierNames = Object.keys(groupedItems);

  useEffect(() => {
    if (order && order.items && order.items.length > 0) {
      const firstSupplier = order.items[0]?.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย';
      setActiveSupplier(firstSupplier);
    }
  }, [order]);

  const currentItems = (order ? (processedItems[activeSupplier] || []) : []) as OrderItemWithDisplay[];
  const tabApprovedBy = currentItems.find(item => item.approve_by)?.approve_by || null;

  // ค้นหาหมายเหตุซัพพลายเออร์จากรายการใดก็ได้ในกลุ่ม
  const activeSupplierRemark = currentItems
    .map(item => (item as OrderItemWithHistory & { supplier_remark?: string | null }).supplier_remark)
    .find(remark => remark && remark.trim() !== '') || '';

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

  useEffect(() => {
    const fetchDates = async () => {
      if (!order) return;
      try {
        const response = await apiClient.post(`/api/orders/${order.id}/date`, {});

        setHistoryDates(response as {
          cycle_1_date: string | null;
          cycle_2_date: string | null;
          cycle_3_date: string | null;
        });
      } catch (err) {
        console.error("Failed to fetch history dates", err);
      }
    };
    fetchDates();
  }, [order?.id]);

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

      // 2. เปลี่ยนสถานะเป็นแสดงข้อความสำเร็จ
      setShowSuccess(true);

      // 3. หน่วงเวลา 2 วินาทีแล้วปิด Modal
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Approval failed:', error);
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

        <div className="bg-zinc-50/20 border-b border-zinc-200 flex flex-col xl:flex-row xl:items-center justify-between transition-all">
          <div className="flex items-center overflow-x-auto scrollbar-none divide-x divide-zinc-100 w-full xl:w-auto flex-1">
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
          ${isActive ? 'bg-white text-black border-b-2 border-b-black font-black shadow-sm' : 'text-zinc-400 hover:bg-zinc-50'}`}
                >
                  <span>{name}</span>
                  {isThisTabApproved && (
                    <span className="text-[9px] bg-zinc-900 text-white px-1.5 py-0.5 rounded-full font-black scale-90">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 💡 ย้ายหมายเหตุมาไว้ฝั่งขวา (Right-aligned) ในหน้าจอใหญ่ */}
          {activeSupplierRemark && (
            <div className="p-3 xl:py-3.5 xl:px-6 w-full xl:w-auto flex justify-end border-t border-zinc-200 xl:border-t-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">หมายเหตุ:</span>
                <span className="text-xs font-medium text-zinc-800">{activeSupplierRemark}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-white">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-400 text-center">
                  <th className="hidden sm:table-cell py-4 px-2 font-medium w-12">ลำดับ</th>
                  <th className="py-3 px-2 text-left font-medium min-w-[140px]">ชื่อสินค้าวัตถุดิบ</th>
                  <th className="py-3 px-2 font-medium min-w-[70px]">คงเหลือ</th>
                  <th className="py-3 px-2 font-black min-w-[70px]">สั่งเพิ่ม</th>

                  {[1, 2, 3].map((i) => {
                    const dateKey = `cycle_${i}_date` as keyof typeof historyDates;
                    const dateValue = historyDates[dateKey];
                    const isHidden = i === 3 ? 'hidden sm:table-cell' : '';

                    return (
                      <th key={i} className={`py-3 px-1 font-medium w-24 ${isHidden}`}>
                        <div>{i} รอบก่อน</div>
                        {dateValue && (
                          <div className="text-[9px] text-zinc-400 font-mono mt-0.5 font-normal">
                            ({new Date(dateValue).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})
                          </div>
                        )}
                      </th>
                    );
                  })}
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
                  const displayQuantityUnit = itemData.quantity_unit || itemData.unit_name || '';
                  const displayOrderUnit = itemData.order_unit || itemData.unit_name || '';
                  const history = itemData.history;
                  const displaySeq = itemData.order_seq !== null && itemData.order_seq !== undefined && itemData.order_seq !== 0 ? itemData.order_seq : itemData.seq;

                  const isNotOrdered = orderCount === 0;
                  const hideInventoryDetails = isNotOrdered;

                  return (
                    <tr key={item.id} className="transition-colors text-center bg-zinc-50/70 hover:bg-zinc-50">
                      <td className="hidden sm:table-cell py-4 px-2 text-zinc-500 font-mono text-xs">
                        {hideInventoryDetails ? (
                          <span className="text-zinc-300">-</span>
                        ) : (
                          displaySeq
                        )}
                      </td>

                      <td className="py-4 px-2 text-left max-w-[150px]">
                        <div className="font-bold break-words leading-tight">{itemData.inventory_name}</div>
                      </td>

                      {/* คงเหลือ พร้อมหน่วย */}
                      <td className="py-4 px-1 font-mono">

                          <>
                            {itemData.quantity} <span className="text-[10px] opacity-70">{displayQuantityUnit}</span>
                          </>
  
                      </td>

                      {/* สั่งเพิ่ม พร้อมหน่วย */}
                      <td className="py-4 px-1 font-mono font-black">
                        {hideInventoryDetails ? (
                          <span className="text-zinc-300">-</span>
                        ) : (
                          <>
                            +{orderCount} <span className="text-[10px] opacity-70">{displayOrderUnit}</span>
                          </>
                        )}
                      </td>

                      {/* ประวัติย้อนหลัง */}
                      {[3, 2, 1].map((cycle) => {
                        const safeHistory = history as Record<string, string | number | null | undefined> | undefined;
                        const stock = safeHistory?.[`cycle_${cycle}_stock`];
                        const order = safeHistory?.[`cycle_${cycle}_order`];
                        const qUnit = safeHistory?.[`cycle_${cycle}_quantity_unit`] || itemData.unit_name;
                        const oUnit = safeHistory?.[`cycle_${cycle}_order_unit`] || itemData.unit_name;

                        return (
                          <td key={cycle} className={`py-2 px-1 ${cycle === 3 ? 'hidden sm:table-cell' : ''}`}>
                            {hideInventoryDetails ? (
                              <span className="text-zinc-300">-</span>
                            ) : (
                              <div className="text-[9px] font-mono leading-tight">
                                <div className="text-zinc-500">เหลือ:</div>
                                <div className="text-zinc-500">{stock ?? '-'} <span className="opacity-60">{qUnit}</span></div>
                                <div className="font-bold text-zinc-800">สั่ง:</div>
                                <div className="font-bold text-zinc-800">{order ?? '-'} <span className="opacity-60">{oUnit}</span></div>
                              </div>
                            )}
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
        {showSuccess && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-zinc-100 flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <div className="text-center">
                <h3 className="font-bold text-zinc-900">อนุมัติเรียบร้อยแล้ว</h3>
                <p className="text-xs text-zinc-500">ระบบกำลังดำเนินการและปิดหน้าต่างนี้...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}