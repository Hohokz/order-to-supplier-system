'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface UnitRow {
    id: string; // ตัวอย่างเช่น KG, BOX, PACK
    unit_name: string; // ตัวอย่างเช่น กิโลกรัม, กล่อง, แพ็ค
}

export function UnitTab() {
    const [data, setData] = useState<UnitRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // 💡 เพิ่มสเตตล็อกปุ่มเซฟป้องกันการส่งข้อมูลซ้ำซ้อน
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({ id: '', unit_name: '' });

    // 💡 ครอบฟังก์ชันด้วย useCallback เพื่อผ่านกฎเกณฑ์ความปลอดภัยของ ESLint 100%
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            // 💡 กำหนด Explicit Type ให้ครอบคลุมรูปแบบข้อมูลของ API
            const res = await apiClient.get<{ data?: UnitRow[] } & UnitRow[]>('/api/units');
            
            // 💡 ตรวจสอบและดักสเปกแกะอาเรย์ หากอยู่ในคีย์ .data หรือมาเป็นอาเรย์ตรงๆ ป้องกันอาการ .map พังระเบิด
            let cleanData: UnitRow[] = [];
            if (res && 'data' in res && Array.isArray(res.data)) {
                cleanData = res.data;
            } else if (Array.isArray(res)) {
                cleanData = res;
            }
            
            setData(cleanData);
        } catch (err) {
            console.error('Failed to fetch units:', err);
            setData([]); // Fallback เป็นอาเรย์ว่างเมื่อเกิดเหตุขัดข้องเพื่อรักษาหน้าจอไม่ให้ล่ม
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true); // สั่งเปิดสถานะกำลังบันทึกข้อมูลดักไว้ทันที
            if (isEditMode) {
                await apiClient.patch(`/api/units/${formData.id}`, formData);
            } else {
                await apiClient.post('/api/units', formData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('ไม่สามารถบันทึกหน่วยนับได้ รหัส ID นี้อาจมีอยู่แล้วในระบบ');
        } finally {
            setIsSubmitting(false); // ปิดสถานะเพื่อคืนปุ่มกลับมาใช้งานปกติ
        }
    };

    if (isLoading) return <div className="text-center py-6 text-xs font-bold text-zinc-400 animate-pulse">กำลังโหลดข้อมูลหน่วยนับ...</div>;

    return (
        <div className="space-y-4 max-w-full mx-auto">
            <div className="flex justify-end">
                <button
                    onClick={() => { setFormData({ id: '', unit_name: '' }); setIsEditMode(false); setIsModalOpen(true); }}
                    className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-zinc-800 transition-all"
                >
                    + เพิ่มหน่วยนับใหม่
                </button>
            </div>

            <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase">
                            <th className="p-3 w-1/3">รหัสหน่วย (Unit ID)</th>
                            <th className="p-3">ชื่อหน่วยนับ</th>
                            <th className="p-3 text-right">การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700 text-xs">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-4 text-center text-zinc-400 font-bold">ไม่พบข้อมูลหน่วยนับในระบบ</td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-zinc-50/50">
                                    <td className="p-3 font-mono font-black text-zinc-900 tracking-wider">{item.id}</td>
                                    <td className="p-3">{item.unit_name}</td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => { setFormData({ id: item.id, unit_name: item.unit_name }); setIsEditMode(true); setIsModalOpen(true); }}
                                            className="font-bold px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-all"
                                        >
                                            แก้ไข
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 w-full max-w-xs p-6 space-y-4 shadow-xl">
                        <h3 className="text-sm font-black border-b pb-2">{isEditMode ? 'แก้ไขหน่วยนับ' : 'เพิ่มหน่วยนับ'}</h3>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500">รหัสหน่วย (อังกฤษตัวพิมพ์ใหญ่) *</label>
                            <input
                                type="text"
                                required
                                disabled={isEditMode || isSubmitting}
                                placeholder="เช่น KG, PCS, BOX"
                                value={formData.id}
                                onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                                className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-bold font-mono uppercase disabled:bg-zinc-50 disabled:text-zinc-400"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500">ชื่อหน่วยนับ (ภาษาไทย) *</label>
                            <input 
                                type="text" 
                                required 
                                disabled={isSubmitting}
                                placeholder="เช่น กิโลกรัม" 
                                value={formData.unit_name} 
                                onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })} 
                                className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50" 
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button 
                                type="button" 
                                disabled={isSubmitting}
                                onClick={() => setIsModalOpen(false)} 
                                className="px-4 py-1.5 border border-zinc-200 text-xs font-bold rounded-xl hover:bg-zinc-50 disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="px-4 py-1.5 bg-black text-white text-xs font-black rounded-xl hover:bg-zinc-800 disabled:bg-zinc-400 transition-all"
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}