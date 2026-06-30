import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      // ดักจับเฉพาะตอนที่มีคนส่งข้อความตัวอักษรคุยกับบอท
      if (event.type === 'message' && event.message.type === 'text') {
        const replyToken = event.replyToken;
        const inputText = event.message.text.trim(); // ชื่อ Username ที่พนักงานพิมพ์มา
        
        // 🚀 ตรงนี้แหละครับ! LINE User ID (รหัสตัว U ลับ 32 หลัก) ที่เราต้องการ
        const lineUserId = event.source.userId; 

        // 🔎 ค้นหาในตารางซิว่าพนักงานที่พิมพ์มา มีสถิตอยู่ในระบบเว็บจัดซื้อไหม
        const userCheck = await query('SELECT id, username FROM users WHERE username = $1', [inputText]);

        if (userCheck.rows.length > 0) {
          // 🔄 เจอตัวจริง! สั่งบันทึกรหัสตัว U ลงช่อง line_id ในตาราง users ทันที
          await query('UPDATE users SET line_id = $1 WHERE username = $2', [lineUserId, inputText]);

          // 💬 ยิงข้อความตอบกลับหาพนักงานในไลน์
          await replyToLine(replyToken, `🎉 ผูกบัญชีกับผู้ใช้ "${inputText}" สำเร็จแล้ว! ต่อไปนี้ระบบจะส่งแจ้งเตือนการอนุมัติออเดอร์ให้คุณผ่านช่องทางนี้ครับ`);
        } else {
          // ❓ กรณีพิมพ์ชื่อผิด หรือทักทายเรื่องอื่นทั่วไป
          await replyToLine(replyToken, `🤖 สวัสดีครับ หากต้องการผูกบัญชีรับแจ้งเตือนออเดอร์ กรุณาพิมพ์เฉพาะ "Username" ที่ใช้ล็อกอินระบบจัดซื้อ ส่งมาให้ผมได้เลยครับ`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Line Webhook Error:', err);
    return NextResponse.json({ error: 'Webhook Process Failed' }, { status: 500 });
  }
}

// ฟังก์ชันสำหรับยิงตอบกลับ (Reply) หาคนพิมพ์ทันที
async function replyToLine(replyToken: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: text }]
    })
  });
}