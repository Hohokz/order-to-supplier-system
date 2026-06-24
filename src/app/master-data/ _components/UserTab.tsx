'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useModal } from '@/context/ModalContext';

interface UserRow {
    id: string;
    username: string;
    name?: string;
    user_role: 'APPROVER' | 'OBSERVER'; // 💡 บีบไทป์ให้ตรงตาม Entity จริงของระบบ
    line_id?: string;
    company_name?: string;
}

const initialFormData = {
    id: '',
    username: '',
    name: '',
    password: '',
    user_role: 'OBSERVER', // 💡 เริ่มต้นด้วยสิทธิ์ดูเท่านั้นเพื่อความปลอดภัย
    line_id: '',
    company_name: ''
};

export function UserTab() {
    const { showError, showSuccess } = useModal();
    const [data, setData] = useState<UserRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(initialFormData);

    // ดึงสิทธิ์คนปัจจุบันเพื่อควบคุมการลบ (ล็อกไว้ว่าต้องเป็น APPROVER เท่านั้นตามเงื่อนไขเดิม)
    const currentUser = { user_role: 'APPROVER' };

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await apiClient.get<{ users?: UserRow[] }>('/api/users');
            setData(res?.users || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setData([]);
            const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
            showError(message, 'ไม่สามารถเรียกข้อมูลผู้ใช้งานได้');
        } finally {
            setIsLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenEdit = (item: UserRow) => {
        setFormData({
            id: item.id,
            username: item.username,
            name: item.name || '',
            password: '',
            user_role: item.user_role,
            line_id: item.line_id || '',
            company_name: item.company_name || ''
        });
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);

            const payload = {
                username: formData.username,
                name: formData.name,
                line_id: formData.line_id,
                lineId: formData.line_id,
                user_role: formData.user_role,
                userRole: formData.user_role,
                password: formData.password,
                password_hash: formData.password,
                company_name: formData.company_name,
                companyName: formData.company_name
            };

            if (isEditMode) {
                await apiClient.patch(`/api/users/${formData.id}`, payload);
                showSuccess('แก้ไขข้อมูลบัญชีพนักงานเรียบร้อยแล้ว');
            } else {
                if (!formData.password) {
                    setIsSubmitting(false);
                    return showError('กรุณาระบุรหัสผ่านเริ่มต้นสำหรับพนักงานใหม่', 'ข้อมูลไม่ครบถ้วน');
                }
                await apiClient.post('/api/users', payload);
                showSuccess('สร้างบัญชีพนักงานใหม่เรียบร้อยแล้ว');
            }
            setIsModalOpen(false);
            setFormData(initialFormData);
            fetchData();
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุจากเซิร์ฟเวอร์';
            showError(message, 'ไม่สามารถบันทึกข้อมูลผู้ใช้ได้');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, username: string) => {
        if (currentUser?.user_role !== 'APPROVER') {
            return showError('คุณไม่มีสิทธิ์ในการลบบัญชีผู้ใช้รายนี้', 'สิทธิ์ไม่เพียงพอ');
        }

        if (!window.confirm(`คุณต้องการลบบัญชีผู้ใช้ "${username}" ใช่หรือไม่?`)) return;
        try {
            setIsLoading(true);
            await apiClient.delete(`/api/users/${id}`);
            showSuccess('ลบบัญชีผู้ใช้งานออกจากระบบสำเร็จแล้ว');
            fetchData();
        } catch (err) {
            console.error('Delete user failed:', err);
            const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูล';
            showError(message, 'ไม่สามารถลบบัญชีได้');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredData = data.filter(item =>
        item.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user_role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <input
                    type="text"
                    placeholder="ค้นหาชื่อบัญชี, พนักงาน, บริษัท หรือสิทธิ์..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:max-w-md px-4 py-2 border border-zinc-200 rounded-full text-sm focus:outline-none focus:border-black font-medium"
                />
                <button
                    onClick={() => {
                        setFormData(initialFormData);
                        setIsEditMode(false);
                        setIsModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-5 py-2 bg-black text-white text-sm font-bold rounded-full hover:bg-zinc-800 transition-all shadow-sm"
                >
                    + เพิ่มบัญชีพนักงานใหม่
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-zinc-200 text-zinc-400">
                            <th className="py-4 px-2 font-medium">ชื่อบัญชี (Username)</th>
                            <th className="py-4 px-2 font-medium">ชื่อพนักงาน (Name)</th>
                            <th className="py-4 px-2 font-medium">ชื่อบริษัท (Company)</th>
                            <th className="py-4 px-2 font-medium text-center">สิทธิ์การเข้าถึง (Role)</th>
                            <th className="py-4 px-2 font-medium">LINE ID</th>
                            <th className="py-4 px-2 font-medium text-right">การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-zinc-400 font-bold animate-pulse">กำลังเรียกรายชื่อสิทธิ์พนักงาน...</td>
                            </tr>
                        ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-zinc-400 font-bold">ไม่พบบัญชีผู้ใช้ในระบบ</td>
                            </tr>
                        ) : (
                            filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="py-4 px-2 font-mono font-bold text-zinc-900">{item.username}</td>
                                    <td className="py-4 px-2 font-medium text-zinc-700">{item.name || '-'}</td>
                                    <td className="py-4 px-2 text-zinc-600 font-medium">{item.company_name || '-'}</td>
                                    <td className="py-4 px-2 text-center">
                                        {/* 💡 ปรับการแสดงผลสีกระดุมสิทธิ์ให้เหลือแค่ APPROVER และ OBSERVER ตามจริง */}
                                        <span className={`px-3 py-1 text-[11px] font-black rounded-full font-mono 
                                            ${item.user_role === 'APPROVER' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-zinc-100 text-zinc-500'}`}>
                                            {item.user_role}
                                        </span>
                                    </td>
                                    <td className="py-4 px-2 text-zinc-500 font-mono text-xs">{item.line_id || '-'}</td>
                                    <td className="py-4 px-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenEdit(item)} className="font-bold px-4 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-black transition-all">
                                                แก้ไข
                                            </button>

                                            {currentUser?.user_role === 'APPROVER' && (
                                                <button
                                                    onClick={() => handleDelete(item.id, item.username)}
                                                    className="font-bold px-4 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-all"
                                                >
                                                    ลบ
                                                </button>
                                            )}
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
                    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 w-full max-w-sm p-6 space-y-4 shadow-xl">
                        <h3 className="text-sm font-black border-b pb-2">{isEditMode ? 'แก้ไขข้อมูลพนักงาน' : 'สร้างไอดีพนักงานใหม่'}</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500">Username *</label>
                                <input type="text" required disabled={isEditMode || isSubmitting} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold font-mono disabled:bg-zinc-50 disabled:text-zinc-400" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500">{isEditMode ? 'รหัสผ่านใหม่ (ไม่บังคับ)' : 'รหัสผ่านแรกเข้า *'}</label>
                                <input type="password" disabled={isSubmitting} placeholder={isEditMode ? "••••••••" : "กรอกรหัสผ่าน"} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-mono font-bold disabled:bg-zinc-50" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500">ชื่อบริษัท (Company Name) *</label>
                            <input type="text" required disabled={isSubmitting} placeholder="เช่น บริษัท ตัวอย่าง จำกัด" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500">ชื่อพนักงาน (Name)</label>
                            <input type="text" disabled={isSubmitting} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500">LINE ID</label>
                            <input type="text" disabled={isSubmitting} value={formData.line_id} onChange={(e) => setFormData({ ...formData, line_id: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500">สิทธิ์พนักงาน (Role)</label>
                            {/* 💡 5. ปรับตัวเลือกในเมนูให้เหลือแค่สิทธิ์ที่ระบบรองรับจริงในคลังข้อมูล */}
                            <select disabled={isSubmitting} value={formData.user_role} onChange={(e) => setFormData({ ...formData, user_role: e.target.value as any })} className="w-full border border-zinc-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-black font-bold disabled:bg-zinc-50">
                                <option value="OBSERVER">OBSERVER (ดูได้อย่างเดียว)</option>
                                <option value="APPROVER">APPROVER (ผู้อนุมัติระบบ)</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button type="button" disabled={isSubmitting} onClick={() => { setIsModalOpen(false); setFormData(initialFormData); }} className="px-4 py-1.5 border border-zinc-200 text-xs font-bold rounded-xl hover:bg-zinc-50 disabled:opacity-50">ปิดฟอร์ม</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-black text-white text-xs font-black rounded-xl hover:bg-zinc-800 disabled:bg-zinc-400 transition-all">{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันข้อมูล'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}