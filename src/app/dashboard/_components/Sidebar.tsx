'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="w-16 md:w-64 bg-black text-white flex flex-col justify-between p-4 transition-all duration-300 shrink-0">
      <div className="space-y-8">
        {/* หัวข้อคอนโซล */}
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-lg shrink-0">
            S
          </div>
          <span className="font-bold text-lg tracking-wider hidden md:block">
            SUPPLIER
          </span>
        </div>

        {/* เมนูนำทาง */}
        <nav className="space-y-1">
          <button className="w-full flex items-center gap-3 px-2 py-3 rounded-xl bg-zinc-900 text-white transition-colors">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            <span className="text-sm font-medium hidden md:block">Dashboard</span>
          </button>
          
          <button className="w-full flex items-center gap-3 px-2 py-3 rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors cursor-not-allowed">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm font-medium hidden md:block">Orders</span>
          </button>
        </nav>
      </div>

      {/* ปุ่มออกจากระบบ */}
      <button 
        onClick={logout}
        className="w-full flex items-center gap-3 px-2 py-3 rounded-xl text-red-400 hover:bg-zinc-950 transition-colors"
      >
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span className="text-sm font-medium hidden md:block">ออกจากระบบ</span>
      </button>
    </aside>
  );
}