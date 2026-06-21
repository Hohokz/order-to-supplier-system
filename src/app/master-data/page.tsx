'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '../dashboard/_components/Sidebar'; // ดึง Sidebar ของบอร์ดหลักมาประกบ
import { InventoryTab } from './ _components/InventoryTab';
import { SupplierTab } from './ _components/SupplierTab';
import { UnitTab } from './ _components/UnitTab';
import { UserTab } from './ _components/UserTab';

type TabType = 'inventory' | 'supplier' | 'unit' | 'user';

export default function MasterDataDashboardPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('inventory');

  // ตรวจสอบสิทธิ์แท็บ (แอดมินเท่านั้นที่จัดการ User ได้)
  const tabs = [
    { id: 'inventory', label: 'คลังสินค้า' },
    { id: 'supplier', label: 'ผู้จัดจำหน่าย' },
    { id: 'unit', label: 'หน่วยนับ' },
    ...(user?.user_role === 'APPROVER' ? [{ id: 'user', label: 'สิทธิ์ผู้ใช้งาน' }] : []),
  ];

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* 🛡️ แผง Sidebar ด้านข้าง ล็อกตำแหน่งถาวรตามสเปกแดชบอร์ดหลัก */}
      <Sidebar /> 

      {/* พื้นที่คอนเทนต์ขวา: ปรับระยะ Padding ให้สอดคล้องกับขนาดจอ Tablet/iPad */}
      <main className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
        
        {/* Dashboard Header Matrix */}
        <div className="mb-5 border-b border-zinc-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-black tracking-tight md:text-2xl">จัดการข้อมูลระบบ (Master Data)</h1>
            <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
              บัญชีผู้ใช้: <span className="underline font-bold text-zinc-700">{user?.username}</span> • สิทธิ์ระดับ: <span className="font-mono text-xs font-black bg-zinc-200/60 px-1.5 py-0.5 rounded text-black">{user?.user_role}</span>
            </p>
          </div>
        </div>

        {/* ตู้คอนเทนเนอร์มัดรวมสไตล์กล่องเดียวจบแบบ Unified Matrix */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
          
          {/* แถบหัวแท็บสั่งสลับ Layout ภายในแดชบอร์ด */}
          <div className="bg-zinc-50 border-b border-zinc-200 flex items-center overflow-x-auto scrollbar-none divide-x divide-zinc-200">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`px-5 py-3.5 text-xs font-black text-center whitespace-nowrap min-w-[120px] tracking-wide transition-all focus:outline-none
                    ${isActive ? 'bg-white text-black border-b-4 border-b-black shadow-inner' : 'text-zinc-500 hover:bg-zinc-100/50'}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* พื้นที่เปลี่ยนผ่าน Component ย่อยด้านในตาราง */}
          <div className="p-3 sm:p-6">
            {activeTab === 'inventory' && <InventoryTab />}
            {activeTab === 'supplier' && <SupplierTab />}
            {activeTab === 'unit' && <UnitTab />}
            {activeTab === 'user' && <UserTab />}
          </div>

        </div>
      </main>
    </div>
  );
}