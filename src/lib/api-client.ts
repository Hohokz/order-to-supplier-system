// src/lib/api-client.ts

export const apiClient = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response = await fetch(endpoint, { ...options, headers });

    // 💡 ดักจับเคส Token หมดอายุ (401) เพื่อทำการต่ออายุอัตโนมัติ
    if (response.status === 401 && typeof window !== 'undefined') {

      // ⚠️ ดักเคสป้องกัน Infinite Loop: ถ้าพยายาม Refresh เองแล้วยังเจอ 401 แปลว่า Session ตายสนิทจริง ๆ
      if (endpoint.includes('/api/auth/refresh')) {
        this.clearSessionAndRedirect();
        throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }

      try {
        // 🔄 1. ยิงไปหาตัว API Route หลังบ้านที่คุณเตรียมไว้เพื่อขอ Token ใบใหม่
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // หากระบบของคุณใช้ HttpOnly Cookie สำหรับ Refresh Token ให้เปิดบรรทัดล่างนี้ด้วยครับ
          // credentials: 'include' 
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json() as { token?: string };

          if (refreshData.token) {
            // 💾 2. บันทึก Token ใบใหม่ลงถังเก็บข้อมูลของเบราว์เซอร์
            localStorage.setItem('token', refreshData.token);

            // 🚀 3. อัปเดตตั๋วใบใหม่เข้าหัว Header ทันที
            headers.set('Authorization', `Bearer ${refreshData.token}`);

            // 🔄 4. ยิงซ่อมคำสั่งเดิมของผู้ใช้อีกครั้ง (Auto Retry)
            response = await fetch(endpoint, { ...options, headers });
          } else {
            this.clearSessionAndRedirect();
          }
        } else {
          this.clearSessionAndRedirect();
        }
      } catch (refreshError) {
        console.error('Silent refresh failed:', refreshError);
        this.clearSessionAndRedirect();
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // 1. ตรวจสอบก่อนว่า data ส่งมาเป็นอาเรย์หรือไม่ ถ้าใช่ให้ดึงสมาชิกตัวแรกออกมาแกะหา message
      const errorData = Array.isArray(data) ? data[0] : data;

      // 2. ดึงข้อความข้อผิดพลาดออกมาอย่างปลอดภัย
      const errorMessage = (errorData as { message?: string })?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ';

      throw new Error(errorMessage);
    }

    return data as T;
  },

  // ฟังก์ชันส่วนกลางสำหรับเคลียร์ข้อมูลเมื่อระบบหมดอายุจริง ๆ
  clearSessionAndRedirect() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  },

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  },

  patch<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  },

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
};