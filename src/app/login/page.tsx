'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LoginForm } from './_components/LoginForm';

export default function LoginPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // 💡 [GUEST-ONLY ROUTE GUARD] บล็อกคนมีสิทธิ์ไม่ให้เห็นหน้าล็อกอินซ้ำซ้อน
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (user?.user_role === 'APPROVE') {
        router.push('/dashboard');
      } else if (user?.user_role === 'OBSERVER') {
        router.push('/order');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // ระหว่างที่ระบบเปิดเครื่องมาค้นหาประวัติ Token ในเครื่องให้หมุนค้างไว้ก่อน ป้องกัน UI แวบกระตุก
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  // หากตรวจพบว่ามี Token ล็อกอินค้างอยู่แล้ว ให้ส่งค่าว่างตัดเนื้อหาทิ้ง เพื่อสลับหน้าอย่างปลอดภัย
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 sm:px-8 md:px-16 lg:px-8">
      <div className="w-full sm:max-w-md md:max-w-lg lg:max-w-md space-y-6 md:space-y-8 rounded-2xl bg-white p-6 sm:p-8 md:p-10 shadow-xl border border-zinc-100 transition-all duration-300">
        
        {/* ส่วนหัวข้อโลโก้ขาวดำคงเดิม */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-black flex items-center justify-center shadow-md shadow-zinc-300">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-4 md:mt-6 text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">เข้าสู่ระบบ</h2>
          <p className="mt-1.5 md:mt-2 text-xs md:text-sm text-zinc-500">ระบบจัดการคำสั่งซื้อและคลังสินค้า</p>
        </div>

        {/* 💡 เรียกใช้ชิ้นส่วนฟอร์มที่แยกกิ่งก้านออกมา */}
        <LoginForm />

      </div>
    </div>
  );
}