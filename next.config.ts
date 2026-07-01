import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // ⚠️ คำเตือน: วิธีนี้จะข้ามการตรวจสอบ Type ตอน Build
    // ทำให้คุณ Deploy ได้แน่นอน แต่ถ้ามี Error ในโค้ด เว็บอาจจะพังตอนรันจริงได้
    ignoreBuildErrors: true, 
  },
  eslint: {
    ignoreDuringBuilds: true, // ปิด ESLint ไปด้วยเลย
  },
};

export default nextConfig;
