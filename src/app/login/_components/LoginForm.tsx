'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth, User } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/Input';

interface LoginResponse {
  accessToken: string;
  user: User;
}

const loginSchema = z.object({
  username: z.string().trim().min(1, 'กรุณากรอกชื่อผู้ใช้งาน'),
  password: z.string().min(6, 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string>('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    try {
      const result = await apiClient.post<LoginResponse>('/api/auth/login', data);
      login(result.accessToken, result.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('เกิดข้อผิดพลาดที่ไม่รู้จักจากระบบหลังบ้าน');
      }
    }
  };

  return (
    <form className="space-y-5 md:space-y-6" onSubmit={handleSubmit(onSubmit)}>
      {serverError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <svg className="h-5 w-5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      <div className="space-y-4 md:space-y-5">
        <Input
          label="ชื่อผู้ใช้งาน"
          type="text"
          placeholder="กรอกชื่อผู้ใช้งาน"
          error={errors.username?.message}
          {...register('username')}
        />

        <Input
          label="รหัสผ่าน"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center items-center gap-2 rounded-xl bg-black text-white shadow-md shadow-zinc-200 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors duration-200
          /* 📱 สเปกปุ่มหนา กดง่ายบน Tablet */
          py-3.5 text-base font-bold
          /* 💻 สเปกปุ่มบนคอมพิวเตอร์ */
          md:py-3 md:text-sm md:font-semibold"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>กำลังตรวจสอบข้อมูล...</span>
          </>
        ) : (
          'เข้าสู่ระบบ'
        )}
      </button>
    </form>
  );
}