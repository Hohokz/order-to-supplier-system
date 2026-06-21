'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface UserRow {
    id: string;
    username: string;
    name?: string;
    user_role: string;
    line_id?: string;
}

export function UserTab() {
    const [data, setData] = useState<UserRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // 💡 อัปเดต State ฟอร์มให้รองรับฟิลด์ name และ line_id ตาม Payload
    const [formData, setFormData] = useState({ 
        id: '', 
        username: '', 
        name: '', 
        password: '', 
        user_role: 'USER', 
        line_id: '' 
    });

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            // 💡 เปลี่ยนมารับค่าจากคีย์ users ตาม Payload จริง
            const res = await apiClient.get<{ users?: UserRow[] }>('/api/users');
            setData(res?.users || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
            line_id: item.line_id || ''
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
                user_role: formData.user_role,
                line_id: formData.line_id,
                ...(formData.password && { password: formData.password })
            };

            if (isEditMode) {
                await apiClient.patch(`/api/users/${formData.id}`, payload);
            } else {
                if (!formData.password) {
                    setIsSubmitting(false);
                    return alert('กรุณาระบุรหัสผ่านเริ่มต้นสำหรับพนักงานใหม่');
                }
                await apiClient.post('/api/users', payload);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredData = data.filter(item => 
        item.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user_role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <input
                    type="text"
                    placeholder="ค้นหาชื่อบัญชี, ชื่อพนักงาน หรือระดับสิทธิ์..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:max-w-md px-4 py-2 border border-zinc-200 rounded-full text-sm focus:outline-none focus:border-black font-medium"
                />
                <button
                    onClick={() => { 
                        setFormData({ id: '', username: '', name: '', password: '', user_role: 'USER', line_id: '' }); 
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
                            <th className="py-4 px-2 font-medium text-center">สิทธิ์การเข้าถึง (Role)</th>
                            <th className="py-4 px-2 font-medium">LINE ID</th>
                            <th className="py-4 px-2 font-medium text-right">การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-zinc-400 font-bold animate-pulse">กำลังเรียกรายชื่อสิทธิ์พนักงาน...</td>
                            </tr>
                        ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-zinc-400 font-bold">ไม่พบบัญชีผู้ใช้ในระบบ</td>
                            </tr>
                        ) : (
                            filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="py-4 px-2 font-mono font-bold text-zinc-900">{item.username}</td>
                                    <td className="py-4 px-2 font-medium text-zinc-700">{item.name || '-'}</td>
                                    <td className="py-4 px-2 text-center">
                                        <span className={`px-3 py-1 text-[11px] font-black rounded-full font-mono 
                                            ${item.user_role === 'ADMIN' ? 'bg-red-50 text-red-700 border border-red-100' : 
                                              item.user_role === 'APPROVER' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                              item.user_role === 'USER' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                                            {item.user_role}
                                        </span>
                                    </td>
                                    <td className="py-4 px-2 text-zinc-500 font-mono text-xs">{item.line_id || '-'}</td>
                                    <td className="py-4 px-2 text-right">
                                        <button onClick={() => handleOpenEdit(item)} className="font-bold px-4 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-black transition-all">
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
                            <label className="text-[10px] font-bold text-zinc-500">ชื่อพนักงาน (Name)</label>
                            <input type="text" disabled={isSubmitting} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500">LINE ID</label>
                            <input type="text" disabled={isSubmitting} value={formData.line_id} onChange={(e) => setFormData({ ...formData, line_id: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500">สิทธิ์พนักงาน (Role)</label>
                            <select disabled={isSubmitting} value={formData.user_role} onChange={(e) => setFormData({ ...formData, user_role: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-black font-bold disabled:bg-zinc-50">
                                <option value="USER">USER (ใช้งานทั่วไป)</option>
                                <option value="APPROVER">APPROVER (ผู้อนุมัติ)</option>
                                <option value="OBSERVER">OBSERVER (ดูเท่านั้น)</option>
                                <option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="px-4 py-1.5 border border-zinc-200 text-xs font-bold rounded-xl hover:bg-zinc-50 disabled:opacity-50">ปิดฟอร์ม</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-black text-white text-xs font-black rounded-xl hover:bg-zinc-800 disabled:bg-zinc-400 transition-all">{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันข้อมูล'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}