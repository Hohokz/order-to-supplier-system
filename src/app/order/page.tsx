'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useModal } from '@/context/ModalContext';
import { Sidebar } from '../dashboard/_components/Sidebar';
import { MasterInventoryRow, MasterInventoryResponse } from '@/types/inventory';

import { InventoryTab } from '@/app/master-data/ _components/InventoryTab';
import { SupplierTab } from '@/app/master-data/ _components/SupplierTab';
import { UnitTab } from '@/app/master-data/ _components/UnitTab';
import { extractErrorMessage } from '@/lib/error';

type OrderHistory = {
  cycle_1_stock: number | null;
  cycle_1_order: number | null;
  cycle_1_date?: string | Date | null;
  cycle_2_stock: number | null;
  cycle_2_order: number | null;
  cycle_2_date?: string | Date | null;
  cycle_3_stock: number | null;
  cycle_3_order: number | null;
  cycle_3_date?: string | Date | null;
};

type FormItemType = MasterInventoryRow & {
  seq: number;
  quantity: number | string;
  order_quantity: number | string;
  quantity_unit?: string; // 💡 เก็บค่าชื่อหน่วยที่เลือก/พิมพ์สำหรับช่อง "คงเหลือ"
  order_unit?: string;    // เก็บค่าชื่อหน่วยที่เลือก/พิมพ์สำหรับช่อง "สั่งเพิ่ม"
  safety_quantity?: number | string;
  history?: OrderHistory;
};

type UnitType = {
  id: string;
  unit_name: string;
};

const MASTER_DATA_TAB = '__MASTER_DATA__';
type MasterSubTabType = 'inventory' | 'supplier' | 'unit';

export default function OrderPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const { showError, showSuccess } = useModal();
  const router = useRouter();

  const [items, setItems] = useState<FormItemType[]>([]);
  const [units, setUnits] = useState<UnitType[]>([]);
  const [signature, setSignature] = useState<string>('');
  const [activeSupplier, setActiveSupplier] = useState<string>('');
  const [skippedSuppliers, setSkippedSuppliers] = useState<string[]>([]);
  const [masterSubTab, setMasterSubTab] = useState<MasterSubTabType>('inventory');

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

        const [masterResult, historyResult, unitsResult] = await Promise.all([
          apiClient.post<MasterInventoryResponse[]>('/api/inventories/master', {}),
          apiClient.get<Record<string, OrderHistory>>('/api/orders/history'),
          apiClient.get<{ data?: UnitType[] } | UnitType[]>('/api/units').catch(() => [])
        ]);

        const targetRows = Array.isArray(masterResult) ? masterResult : [];
        const historyMap = historyResult || {};

        let finalUnits: UnitType[] = [];
        if (Array.isArray(unitsResult)) {
          finalUnits = unitsResult;
        } else if (unitsResult && Array.isArray(unitsResult.data)) {
          finalUnits = unitsResult.data;
        }
        setUnits(finalUnits);

        const itemsWithFormState: FormItemType[] = targetRows.map((row) => {
          const inventoryRow = row as unknown as MasterInventoryRow;
          const defaultUnitName = inventoryRow.unit?.unit_name || '';

          return {
            id: inventoryRow.id,
            inventory_name: inventoryRow.inventory_name,
            inventory_quantity: inventoryRow.inventory_quantity,
            unit_price: inventoryRow.unit_price,
            status: inventoryRow.status,
            supplier: inventoryRow.supplier,
            unit: inventoryRow.unit,
            safety_quantity: inventoryRow.safety_quantity,
            seq: inventoryRow.seq,
            created_date: inventoryRow.created_date,
            quantity: '',
            order_quantity: '',
            quantity_unit: defaultUnitName, // 💡 เริ่มต้นใช้หน่วยนับหลักของวัตถุดิบ
            order_unit: defaultUnitName,    // เริ่มต้นใช้หน่วยนับหลักของวัตถุดิบ
            history: historyMap[inventoryRow.id] || {
              cycle_1_stock: null, cycle_1_order: null,
              cycle_2_stock: null, cycle_2_order: null,
              cycle_3_stock: null, cycle_3_order: null
            }
          };
        });

        setItems(itemsWithFormState);
      } catch (err: unknown) {
        console.error(err);
        const errorMessage = extractErrorMessage(err, 'ไม่สามารถดึงข้อมูลสินค้าได้');
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

  // 💡 ฟังก์ชันควบคุมการเปลี่ยนชื่อหน่วยนับแบบไดนามิกแยกฟิลด์อิสระ
  const handleUnitTextChange = (itemId: string, field: 'quantity_unit' | 'order_unit', newText: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, [field]: newText } : item
      )
    );
  };

  const handleToggleSkipSupplier = () => {
    if (skippedSuppliers.includes(activeSupplier)) {
      setSkippedSuppliers(prev => prev.filter(s => s !== activeSupplier));
    } else {
      setSkippedSuppliers(prev => [...prev, activeSupplier]);
      setItems((prev) =>
        prev.map((item) => {
          const supplierName = item.supplier?.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย';
          if (supplierName === activeSupplier) {
            return { ...item, quantity: '', order_quantity: '' };
          }
          return item;
        })
      );
    }
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
      const supplierName = item.supplier?.supplier_name || 'ไม่ระบุผู้จัดจำหน่าย';
      if (skippedSuppliers.includes(supplierName)) return false;

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
        items: filteredItems.map(item => {
          const defaultUnitName = item.unit?.unit_name || '';
          const currentQuantityUnit = item.quantity_unit?.trim() || defaultUnitName;
          const currentOrderUnit = item.order_unit?.trim() || defaultUnitName;

          return {
            inventory_id: item.id,
            quantity: Number(item.quantity),
            order_quantity: Number(item.order_quantity),
            // 💡 แนบค่าชื่อหน่วยนับของแต่ละฝั่งส่งไปบันทึกยัง Database หลังบ้าน
            quantity_unit: currentQuantityUnit,
            order_unit: currentOrderUnit
          };
        })
      };

      await apiClient.post('/api/orders', payload);

      const successText = 'ส่งใบจัดทำคำสั่งซื้อเข้าสู่ระบบสำเร็จแล้ว!';
      setMessage({ type: 'success', text: successText });
      showSuccess(successText);
      setSignature('');
      setSkippedSuppliers([]);
      setItems(prev => prev.map(item => ({
        ...item,
        quantity: '',
        order_quantity: '',
        quantity_unit: item.unit?.unit_name || '',
        order_unit: item.unit?.unit_name || ''
      })));
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'ไม่สามารถบันทึกคำสั่งซื้อได้');
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
  const cycle1Date = currentItems.find(item => item.history?.cycle_1_date)?.history?.cycle_1_date;
  const cycle2Date = currentItems.find(item => item.history?.cycle_2_date)?.history?.cycle_2_date;
  const isCurrentSkipped = skippedSuppliers.includes(activeSupplier);
  const isMasterDataMode = activeSupplier === MASTER_DATA_TAB;

  const masterSubTabs: { id: MasterSubTabType; label: string }[] = [
    { id: 'inventory', label: 'คลังสินค้า' },
    { id: 'supplier', label: 'ผู้จัดจำหน่าย' },
    { id: 'unit', label: 'หน่วยนับ' },
  ];

  const displayTodayDate = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <Sidebar />

      <main className="flex-1 p-3 md:p-8 overflow-y-auto">
        <div className="mb-6 border-b border-zinc-200 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {isMasterDataMode ? 'จัดการข้อมูลหลัก (Master Data)' : 'จัดทำใบสั่งซื้อวัตถุดิบ'}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">ผู้บันทึกรายการ: {user?.username} ({user?.user_role})</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSupplier(isMasterDataMode ? (supplierNames[0] ?? '') : MASTER_DATA_TAB)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full border text-xs font-bold shadow-sm transition-all
                ${isMasterDataMode
                  ? 'bg-black text-white border-black hover:bg-zinc-800'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-black'}`}
            >
              <span>{isMasterDataMode ? '← กลับหน้าสั่งซื้อ' : '⚙️ จัดการข้อมูลหลัก'}</span>
            </button>

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
        </div>

        {message && !isMasterDataMode && (
          <div className={`mb-4 p-4 rounded-xl text-sm font-bold border ${message.type === 'success' ? 'bg-zinc-900 text-white border-black' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">

            <div className="bg-zinc-50/50 border-b border-zinc-200 flex items-center overflow-x-auto scrollbar-none divide-x divide-zinc-100">
              {supplierNames.map((name) => {
                const isActive = activeSupplier === name;
                const isSkipped = skippedSuppliers.includes(name);

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveSupplier(name)}
                    className={`px-6 py-4 text-sm font-bold text-center whitespace-nowrap min-w-[140px] transition-all focus:outline-none flex flex-col items-center gap-0.5
                      ${isActive ? 'bg-white text-black border-b-2 border-b-black font-black' : 'text-zinc-400 hover:bg-zinc-50'}
                      ${isSkipped ? 'opacity-50' : ''}`}
                  >
                    <span>{name}</span>
                    {isSkipped && <span className="text-[9px] bg-zinc-200 text-zinc-600 px-1.5 rounded-full font-medium">ไม่ได้สั่งเจ้านี้</span>}
                  </button>
                );
              })}
            </div>

            {isMasterDataMode ? (
              <div className="flex flex-col">
                <div className="bg-zinc-50 border-b border-zinc-200 flex items-center overflow-x-auto scrollbar-none divide-x divide-zinc-200">
                  {masterSubTabs.map((tab) => {
                    const isActive = masterSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setMasterSubTab(tab.id)}
                        className={`px-5 py-3.5 text-xs font-black text-center whitespace-nowrap min-w-[120px] tracking-wide transition-all focus:outline-none
                          ${isActive ? 'bg-white text-black border-b-4 border-b-black shadow-inner' : 'text-zinc-500 hover:bg-zinc-100/50'}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 sm:p-6">
                  {masterSubTab === 'inventory' && <InventoryTab />}
                  {masterSubTab === 'supplier' && <SupplierTab />}
                  {masterSubTab === 'unit' && <UnitTab />}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitOrder}>
                <div className="p-2 md:p-6">
                  <div className="overflow-x-auto">
                    <table className={`w-full text-left border-collapse text-sm transition-all duration-300 ${isCurrentSkipped ? 'opacity-40 pointer-events-none grayscale select-none' : ''}`}>
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-400 text-xs uppercase text-center">
                          <th className="py-4 px-2 text-left font-medium min-w-[150px]">ชื่อสินค้า</th>
                          <th className="py-4 px-2 font-medium w-24">
                            <div>2 รอบก่อน</div>
                            {cycle2Date && (
                              <div className="text-[10px] text-zinc-400 font-mono mt-0.5 font-normal whitespace-nowrap">
                                ({new Date(cycle2Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })})
                              </div>
                            )}
                          </th>
                          <th className="py-4 px-2 font-medium w-24">
                            <div>1 รอบก่อน</div>
                            {cycle1Date && (
                              <div className="text-[10px] text-zinc-400 font-mono mt-0.5 font-normal whitespace-nowrap">
                                ({new Date(cycle1Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })})
                              </div>
                            )}
                          </th>
                          <th className="py-4 px-2 font-medium text-zinc-900 w-44">คงเหลือ *</th>
                          <th className="py-4 px-2 font-black text-black w-44">สั่งเพิ่ม *</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-zinc-800">
                        {currentItems.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-zinc-400 text-xs">
                              ไม่พบรายการสินค้าสำหรับซัพพลายเออร์เจ้านี้
                            </td>
                          </tr>
                        )}
                        {currentItems.map((item) => {
                          const currentCount = Number(item.quantity);
                          const safetyLimitNum = typeof item.safety_quantity === 'number' ? item.safety_quantity : Number(item.safety_quantity) || 0;
                          const hasInputtedStock = item.quantity !== '';
                          const isBelowSafety = !isNaN(currentCount) && currentCount < safetyLimitNum;

                          let rowBgClass = "hover:bg-zinc-50/50";
                          if (hasInputtedStock && isBelowSafety && !isCurrentSkipped) {
                            rowBgClass = "bg-red-50/60 hover:bg-red-50/80 text-red-950 border-red-100 transition-colors";
                          }

                          const unitStr = item.unit?.unit_name || 'หน่วย';

                          return (
                            <tr key={item.id} className={`transition-colors text-center ${rowBgClass}`}>
                              <td className="py-4 px-2 font-bold text-zinc-900 text-left">
                                <span className="block truncate max-w-[140px] sm:max-w-none" title={item.inventory_name}>
                                  {item.inventory_name}
                                </span>
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

                              {/* คงเหลือ (💡 ปรับปรุงให้พิมพ์ได้ + เลือกเป็น Dropdown ได้แบบเดียวกับช่องสั่งเพิ่ม) */}
                              <td className="py-3 px-2">
                                <div className="flex items-center justify-center gap-1">
                                  <div className={`flex items-center w-20 h-8 rounded-xl border bg-white px-2 transition-all ${(hasInputtedStock && isBelowSafety && !isCurrentSkipped) ? 'border-red-400 ring-1 ring-red-400' : 'border-zinc-200 focus-within:border-black'}`}>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0"
                                      value={item.quantity}
                                      onChange={(e) => handleNumberChange(item.id, 'quantity', e.target.value)}
                                      disabled={isCurrentSkipped}
                                      onFocus={() => {
                                        handleNumberChange(item.id, 'quantity', '');
                                      }}
                                      onBlur={() => {
                                        if (item.quantity === '') {
                                          handleNumberChange(item.id, 'quantity', '0');
                                        }
                                      }}
                                      className="w-full text-center font-mono text-xs font-bold focus:outline-none bg-transparent disabled:bg-transparent"
                                    />
                                  </div>

                                  {/* Combobox หน่วยนับของฝั่งคงเหลือ (quantity_unit) */}
                                  <div className="relative group/combo-stock w-24 h-8">
                                    <div className="flex items-center w-full h-full rounded-xl border border-zinc-300 bg-white px-1.5 focus-within:border-black transition-all">
                                      <input
                                        type="text"
                                        value={item.quantity_unit || ''}
                                        disabled={isCurrentSkipped}
                                        onChange={(e) => handleUnitTextChange(item.id, 'quantity_unit', e.target.value)}
                                        placeholder={unitStr}
                                        onFocus={() => {
                                          handleUnitTextChange(item.id, 'quantity_unit', '');
                                        }}
                                        onBlur={() => {
                                          setTimeout(() => {
                                            if (!item.quantity_unit) {
                                              handleUnitTextChange(item.id, 'quantity_unit', unitStr);
                                            }
                                          }, 150);
                                        }}
                                        className="w-full text-center font-sans text-[10px] font-black focus:outline-none bg-transparent pr-2 animate-none"
                                      />
                                      <span className="text-[7px] text-zinc-400 pointer-events-none select-none">▼</span>
                                    </div>

                                    {!isCurrentSkipped && (
                                      <div className="absolute left-0 top-full mt-1 w-full max-h-32 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg hidden group-focus-within/combo-stock:block hover:block z-50 divide-y divide-zinc-50 scrollbar-none">
                                        <button
                                          type="button"
                                          onMouseDown={() => handleUnitTextChange(item.id, 'quantity_unit', unitStr)}
                                          className="w-full text-center py-1.5 px-1 text-[10px] font-bold text-zinc-700 hover:bg-zinc-100 transition-colors block truncate"
                                        >
                                          {unitStr}
                                        </button>
                                        {units.filter((u) => u.unit_name !== unitStr).map((u) => (
                                          <button
                                            key={u.id}
                                            type="button"
                                            onMouseDown={() => handleUnitTextChange(item.id, 'quantity_unit', u.unit_name)}
                                            className="w-full text-center py-1.5 px-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-50 hover:text-black transition-colors block truncate"
                                          >
                                            {u.unit_name}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* สั่งเพิ่ม */}
                              <td className="py-3 px-2">
                                <div className="flex items-center justify-center gap-1">
                                  <div className="flex items-center w-20 h-8 rounded-xl border border-black bg-white px-2 focus-within:ring-1 focus-within:ring-black transition-all">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0"
                                      value={item.order_quantity}
                                      onChange={(e) => handleNumberChange(item.id, 'order_quantity', e.target.value)}
                                      disabled={isCurrentSkipped}
                                      onFocus={() => {
                                        handleNumberChange(item.id, 'order_quantity', '');
                                      }}
                                      onBlur={() => {
                                        if (item.order_quantity === '') {
                                          handleNumberChange(item.id, 'order_quantity', '0');
                                        }
                                      }}
                                      className="w-full text-center font-mono text-xs font-black focus:outline-none bg-transparent disabled:bg-transparent"
                                    />
                                  </div>

                                  {/* Combobox หน่วยนับของฝั่งสั่งเพิ่ม (order_unit) */}
                                  <div className="relative group/combo w-24 h-8">
                                    <div className="flex items-center w-full h-full rounded-xl border border-zinc-300 bg-white px-1.5 focus-within:border-black transition-all">
                                      <input
                                        type="text"
                                        value={item.order_unit || ''}
                                        disabled={isCurrentSkipped}
                                        onChange={(e) => handleUnitTextChange(item.id, 'order_unit', e.target.value)}
                                        placeholder={unitStr}
                                        onFocus={() => {
                                          handleUnitTextChange(item.id, 'order_unit', '');
                                        }}
                                        onBlur={() => {
                                          setTimeout(() => {
                                            if (!item.order_unit) {
                                              handleUnitTextChange(item.id, 'order_unit', unitStr);
                                            }
                                          }, 150);
                                        }}
                                        className="w-full text-center font-sans text-[10px] font-black focus:outline-none bg-transparent pr-2 animate-none"
                                      />
                                      <span className="text-[7px] text-zinc-400 pointer-events-none select-none">▼</span>
                                    </div>

                                    {!isCurrentSkipped && (
                                      <div className="absolute left-0 top-full mt-1 w-full max-h-32 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg hidden group-focus-within/combo:block hover:block z-50 divide-y divide-zinc-50 scrollbar-none">
                                        <button
                                          type="button"
                                          onMouseDown={() => handleUnitTextChange(item.id, 'order_unit', unitStr)}
                                          className="w-full text-center py-1.5 px-1 text-[10px] font-bold text-zinc-700 hover:bg-zinc-100 transition-colors block truncate"
                                        >
                                          {unitStr}
                                        </button>
                                        {units.filter((u) => u.unit_name !== unitStr).map((u) => (
                                          <button
                                            key={u.id}
                                            type="button"
                                            onMouseDown={() => handleUnitTextChange(item.id, 'order_unit', u.unit_name)}
                                            className="w-full text-center py-1.5 px-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-50 hover:text-black transition-colors block truncate"
                                          >
                                            {u.unit_name}
                                          </button>
                                        ))}
                                      </div>
                                    )}
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

                {/* Action Footer Bar */}
                <div className="p-4 md:p-5 bg-zinc-50 border-t border-zinc-200 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 w-full xl:max-w-2xl">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                        ลงนาม (Signature) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        placeholder="กรอกชื่อผู้บันทึกรายการ"
                        className="w-full font-mono font-bold text-zinc-800 border border-zinc-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-black transition-all bg-white placeholder:font-sans placeholder:font-normal placeholder:text-zinc-400 text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                        วันที่ทำรายการ (Date)
                      </label>
                      <div className="w-full font-sans font-bold text-zinc-500 border border-zinc-200/60 rounded-lg px-4 py-2.5 bg-zinc-100/50 text-sm select-none flex items-center h-[42px]">
                        {displayTodayDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
                    <button
                      type="button"
                      onClick={handleToggleSkipSupplier}
                      disabled={isSubmitting}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold transition-all w-full sm:w-auto
                        ${isCurrentSkipped
                          ? 'bg-zinc-900 border-black text-white hover:bg-zinc-800 shadow-sm'
                          : 'bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-black'}`}
                    >
                      {isCurrentSkipped ? '↺ เปิดสั่งเจ้านี้ใหม่' : '✕ ข้ามเจ้านี้ (ไม่สั่ง)'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-black text-white text-xs font-black shadow-sm hover:bg-zinc-800 active:scale-[0.98] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all w-full sm:w-auto whitespace-nowrap"
                    >
                      {isSubmitting ? 'กำลังบันทึก...' : 'ส่งใบจัดทำคำสั่งซื้อรวม'}
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}