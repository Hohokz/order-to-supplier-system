'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // 💡 ใช้สำหรับดักจับตำแหน่ง URL ปัจจุบัน
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  // 💡 ถ้าเป็น OBSERVER ไม่ต้องแสดง Sidebar ออกมาบนหน้าจอเลย
  if (user?.user_role === 'OBSERVER') return null;

  // 💡 รายการเมนูฝั่งซ้าย: รองรับการขยายตัวเพิ่มในอนาคตได้ง่ายผ่านโครงสร้าง Array
  const menuItems = [
    {
      name: 'ภาพรวมคำสั่งซื้อ',
      path: '/dashboard',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      name: 'จัดทำใบสั่งซื้อ',
      path: '/order', // 💡 ชี้เป้าเชื่อมต่อไปยังหน้าฟอร์มกรอกข้อมูลสั่งซื้อ
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-zinc-200 min-h-screen flex flex-col justify-between hidden md:flex shrink-0">
      
      {/* ส่วนบน: โลโก้แบรนด์ระบบ และรายการนำทางหลัก */}
      <div className="p-6">
        {/* โลโก้ระบบ */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center shadow-md shadow-zinc-200">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="font-black text-sm tracking-wider uppercase text-zinc-900">WMS SYSTEM</span>
        </div>

        {/* เมนูลิงก์แบบ Dynamic */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            // 💡 ตรวจจับว่า URL ปัจจุบันตรงกับเมนูนี้หรือไม่ เพื่อสับสวิตช์สีพื้นหลัง
            const isActive = pathname === item.path;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 active:scale-[0.98]
                  ${isActive 
                    ? 'bg-black text-white shadow-md shadow-zinc-200' 
                    : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                  }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ส่วนล่างสุด: รายละเอียดโปรไฟล์สิทธิ์ และปุ่มสั่งตัดเซสชัน Logout */}
      <div className="p-4 border-t border-zinc-100 bg-zinc-50/50">
        <div className="px-2 mb-4">
          <p className="text-xs font-black text-zinc-800 truncate">ผู้ใช้งาน: {user?.username || 'Unidentified'}</p>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">ระดับสิทธิ์: {user?.user_role || 'Guest'}</p>
        </div>
        
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 text-xs font-bold shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:bg-red-100 transition-all duration-150"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>ออกจากระบบ</span>
        </button>
      </div>

    </aside>
  );
}