'use client';

import React, { useEffect, Suspense } from 'react'; // 🚀 1. เพิ่ม Suspense
import { useAuth } from '@/context/AuthContext';
// 🚀 2. เพิ่ม useSearchParams สำหรับแอบส่องเลขออเดอร์จาก LINE
import { useRouter, useSearchParams } from 'next/navigation'; 
import { LoginForm } from './_components/LoginForm';

function LoginContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); // 🚀 3. ประกาศตัวแปรส่องพารามิเตอร์ URL

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // 🚀 4. ดักจับดูว่ามีเลขออเดอร์จากไลน์แปะมากับลิงก์ล็อกอินไหม
      const openOrder = searchParams.get('openOrder');
      const appendParam = openOrder ? `?openOrder=${openOrder}` : '';

      if (user?.user_role === 'APPROVER') {
        // 🚀 5. ดีดพุ่งตรงไปที่หน้า Dashboard พร้อมพ่วงไอดีออเดอร์ไปเปิดป๊อปอัปทันที
        router.push(`/dashboard${appendParam}`); 
      } else if (user?.user_role === 'OBSERVER') {
        router.push('/order');
      } else {
        router.push(`/dashboard${appendParam}`);
      }
    }
  }, [isAuthenticated, isLoading, user, router, searchParams]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 sm:px-8 md:px-16 lg:px-8">
      <div className="w-full sm:max-w-md md:max-w-lg lg:max-w-md space-y-6 md:space-y-8 rounded-2xl bg-white p-6 sm:p-8 md:p-10 shadow-xl border border-zinc-100 transition-all duration-300">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-black flex items-center justify-center shadow-md shadow-zinc-300">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-4 md:mt-6 text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">เข้าสู่ระบบ</h2>
          <p className="mt-1.5 md:mt-2 text-xs md:text-sm text-zinc-500">ระบบจัดการคำสั่งซื้อและคลังสินค้า</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}

// 🚀 6. ครอบฟังก์ชันเนื้อหาหลักด้วย Suspense กันบั๊กหน้าจอค้างตอนล็อกอิน
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}