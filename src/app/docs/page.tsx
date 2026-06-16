'use client';

import dynamic from 'next/dynamic';
// @ts-expect-error Swagger UI CSS import has no type declarations
import 'swagger-ui-react/swagger-ui.css';

// ใช้ dynamic import เพื่อป้องกัน Error จาก Server-Side Rendering (SSR) เนื่องจาก Swagger UI ต้องรันบนฝั่ง Client
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="container mx-auto p-4">
      <SwaggerUI url="/openapi.json" />
    </div>
  );
}