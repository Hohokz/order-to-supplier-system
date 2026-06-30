import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code'); // โค้ดลับที่ LINE ดีดส่งกลับมาให้หน้าเว็บ
  const state = searchParams.get('state'); // ค่า id ของผู้ใช้ที่ล็อกอินอยู่ในเว็บตอนนี้ (เราแนบไปตอนส่งตัว)

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  try {
    // 1. นำ code ที่ได้ไปแลกเปลี่ยนเป็น Access Token หลังบ้านกับเซิร์ฟเวอร์ LINE
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/line/callback`,
        client_id: process.env.LINE_LOGIN_CLIENT_ID || '',     // คีย์ LINE Login Channel ID
        client_secret: process.env.LINE_LOGIN_CLIENT_SECRET || '' // คีย์ LINE Login Channel Secret
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('Cannot get access token from LINE');
    }

    // 2. นำ Access Token ที่ได้ ไปยิงขอข้อมูลโปรไฟล์ (Profile) ของผู้ใช้งานรายนี้
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const profileData = await profileResponse.json();
    
    // 🚀 เจอตัวแล้ว! ข้อมูลตัว U ลับจะสถิตอยู่ในฟิลด์ userId ของก้อนโปรไฟล์นี้ครับ
    const lineUserId = profileData.userId; 

    if (lineUserId) {
      // 🔄 สั่ง Update รหัสตัว U บันทึกเข้าเบสผูกกับไอดีพนักงานคนนั้น (ค่า state) ทันที
      await query('UPDATE users SET line_id = $1 WHERE id = $2', [lineUserId, state]);

      // 🔄 ผูกเสร็จแล้ว สั่งเด้งหน้าจอพนักงานกลับไปที่หน้าตั้งค่าโปรไฟล์พร้อมแนบสถานะความสำเร็จ
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?line_success=true`);
    }

    throw new Error('Cannot extract LINE User ID');
  } catch (err) {
    console.error('LINE Login Callback Error:', err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?line_error=true`);
  }
}