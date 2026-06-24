// src/app/error.tsx
'use client';

import React, { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // บันทึก Error ลงระบบ Console เพื่อให้ดีบั๊กได้ง่าย
    console.error('Unhandled UI rendering crash:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans text-zinc-900">
      <div className="w-full max-w-md bg-white rounded-3xl border border-zinc-200 shadow-xl p-8 flex flex-col items-center text-center space-y-6 animate-scale-up">
        {/* Warning Icon Container */}
        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 border border-red-100 animate-pulse">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Heading & Detail */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-zinc-950 tracking-tight">เกิดข้อผิดพลาดในการโหลดข้อมูลหน้าเว็บ</h2>
          <p className="text-xs font-semibold text-zinc-400">ระบบพบข้อขัดข้องบางประการที่ทำให้ไม่สามารถแสดงผลเนื้อหาได้</p>
        </div>

        {/* Error Message Details Box */}
        <div className="w-full bg-zinc-50 rounded-2xl border border-zinc-200 p-4 text-left font-mono text-[11px] text-zinc-600 max-h-36 overflow-y-auto whitespace-pre-wrap select-all leading-relaxed">
          <strong>รายละเอียด: </strong>
          {error.message || 'ไม่พบคำอธิบายเฉพาะตัวจากตัวระบบ'}
          {error.digest && (
            <div className="mt-1 text-[10px] text-zinc-400">
              Digest ID: {error.digest}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/dashboard';
            }}
            className="flex-1 px-5 py-3 border border-zinc-200 text-xs font-black rounded-xl text-zinc-600 hover:bg-zinc-50 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            กลับสู่หน้าหลัก
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex-1 px-5 py-3 bg-black text-white text-xs font-black rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-150 cursor-pointer shadow-md"
          >
            ลองโหลดใหม่อีกครั้ง
          </button>
        </div>
      </div>
    </div>
  );
}
