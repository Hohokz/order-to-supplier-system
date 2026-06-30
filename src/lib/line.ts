// src/lib/line.ts

/**
 * ฟังก์ชันยิงข้อความ Push Message ตรงเข้า LINE ส่วนตัวของผู้ใช้งานด้วยคีย์ line_id
 */
export async function sendLineMessage(lineId: string, text: string): Promise<void> {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelAccessToken) {
        console.warn('⚠️ ไม่สามารถส่ง LINE ได้: ลืมตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน .env');
        return;
    }

    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`,
            },
            body: JSON.stringify({
                to: lineId,
                messages: [
                    {
                        type: 'text',
                        text: text,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`LINE API responded with status ${response.status}: ${errBody}`);
        }

        // 🚀 เพิ่มบรรทัดนี้เข้าไปครับ เพื่อช่วยให้เราเห็นสถานะความสำเร็จในหน้าจอ npm run dev ชัดๆ
        console.log(`✅ [LINE] ส่งข้อความหาไอดี ${lineId} สำเร็จแล้ว!`);

    } catch (error) {
        console.error('❌ Failed to push LINE message:', error);
        // ไม่ทำการ throw error ต่อ เพื่อป้องกันไม่ให้ระบบหลักพังหากเซิร์ฟเวอร์ LINE ล่ม
    }
}