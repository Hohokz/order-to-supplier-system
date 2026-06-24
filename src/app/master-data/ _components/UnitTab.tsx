'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useModal } from '@/context/ModalContext';

interface UnitRow {
    id: string; // ตัวอย่างเช่น KG, BOX, PACK
    unit_name: string; // ตัวอย่างเช่น กิโลกรัม, กล่อง, แพ็ค
}

export function UnitTab() {
    const { showError, showSuccess } = useModal();
    const [data, setData] = useState<UnitRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // 💡 เพิ่ม State สำหรับช่องค้นหาให้เข้าเซ็ต
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({ id: '', unit_name: '' });

    // 💡 ครอบฟังก์ชันด้วย useCallback เพื่อผ่านกฎเกณฑ์ความปลอดภัยของ ESLint 100%
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await apiClient.get<{ data?: UnitRow[] } & UnitRow[]>('/api/units');

            let cleanData: UnitRow[] = [];
            if (res && 'data' in res && Array.isArray(res.data)) {
                cleanData = res.data;
            } else if (Array.isArray(res)) {
                cleanData = res;
            }

            setData(cleanData);
        } catch (err) {
            console.error('Failed to fetch units:', err);
            setData([]);
            const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
            showError(message, 'ไม่สามารถเรียกข้อมูลหน่วยนับได้');
        } finally {
            setIsLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);

            // 💡 แปลงร่างโครงสร้างข้อมูลให้ตรงล็อกตามที่ Zod หลังบ้านต้องการ (เปลี่ยน id เป็น unit)
            const payload = {
                unit: formData.id,
                unit_name: formData.unit_name
            };

            if (isEditMode) {
                await apiClient.patch(`/api/units/${formData.id}`, payload);
                showSuccess('แก้ไขหน่วยนับสำเร็จแล้ว');
            } else {
                await apiClient.post('/api/units', payload);
                showSuccess('เพิ่มหน่วยนับเรียบร้อยแล้ว');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'ไม่สามารถบันทึกหน่วยนับได้ รหัส ID นี้อาจมีอยู่แล้วในระบบ';
            showError(message, 'ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 💡 เพิ่มฟังก์ชันลบตาม Pattern ความปลอดภัย พร้อมแจ้งเตือนก่อนลบ
    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`คุณต้องการลบหน่วยนับ "${name}" (${id}) ใช่หรือไม่?`)) return;
        try {
            setIsLoading(true);
            await apiClient.delete(`/api/units/${id}`);
            showSuccess('ลบหน่วยนับออกจากระบบเรียบร้อยแล้ว');
            fetchData();
        } catch (err) {
            console.error('Delete unit failed:', err);
            const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูล';
            showError(message, 'ไม่สามารถลบข้อมูลได้ (หน่วยนับนี้อาจถูกผูกใช้งานอยู่ในคลังวัตถุดิบ)');
        } finally {
            setIsLoading(false);
        }
    };

    // 💡 ลอจิกคัดกรองข้อมูลหน่วยนับสำหรับกล่องค้นหาแบบ Real-time
    const filteredData = data.filter(item =>
        item.unit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pt-4">
            {/* Action Bar ค้นหาและปุ่มสร้างไอเทม สไตล์ Clean UI มนแคปซูล */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <input
                    type="text"
                    placeholder="ค้นหาชื่อหน่วยนับ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:max-w-md px-4 py-2 border border-zinc-200 rounded-full text-sm focus:outline-none focus:border-black font-medium"
                />
                <button
                    onClick={() => { setFormData({ id: '', unit_name: '' }); setIsEditMode(false); setIsModalOpen(true); }}
                    className="w-full sm:w-auto px-5 py-2 bg-black text-white text-sm font-bold rounded-full hover:bg-zinc-800 transition-all shadow-sm"
                >
                    + เพิ่มหน่วยนับใหม่
                </button>
            </div>

            {/* ตารางหน่วยนับ: โปร่งโล่ง ไม่มีพื้นหลังเทาและกรอบทึบล้อมรอบ */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-zinc-200 text-zinc-400">
                            <th className="py-4 px-2 font-medium w-1/3">รหัสหน่วย (UNIT ID)</th>
                            <th className="py-4 px-2 font-medium">ชื่อหน่วยนับ</th>
                            <th className="py-4 px-2 font-medium text-right">การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={3} className="py-8 text-center text-zinc-400 font-bold animate-pulse">กำลังโหลดข้อมูลหน่วยนับ...</td>
                            </tr>
                        ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="py-8 text-center text-zinc-400 font-bold">ไม่พบข้อมูลหน่วยนับในระบบ</td>
                            </tr>
                        ) : (
                            filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="py-4 px-2 font-bold text-zinc-900 tracking-wider">{item.id}</td>
                                    <td className="py-4 px-2 text-zinc-600 font-medium">{item.unit_name}</td>
                                    <td className="py-4 px-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setFormData({ id: item.id, unit_name: item.unit_name }); setIsEditMode(true); setIsModalOpen(true); }}
                                                className="font-bold px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-black transition-all"
                                            >
                                                แก้ไข
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id, item.unit_name)}
                                                className="font-bold px-3 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-all"
                                            >
                                                ลบ
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Popup Form Modal */}
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