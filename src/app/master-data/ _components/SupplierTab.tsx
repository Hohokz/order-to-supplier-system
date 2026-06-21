'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { SupplierRow } from '@/types/supplier';

const initialFormData = {
  id: '',
  supplier_name: '',
  phone: '',
  address: '',
  status: 'ACTIVE'
};

export function SupplierTab() {
  const [data, setData] = useState<SupplierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  // 💡 ครอบฟังก์ชันเดิมด้วย useCallback
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const payload = {
        page: 1,
        limit: 100,
        filters: { supplierName: searchTerm }
      };

      // 💡 ระบุ Generic Type ให้ตรงกับหน้าตา JSON (มีคีย์ data เป็น Array ของ SupplierRow)
      const res = await apiClient.post<{ data?: SupplierRow[] }>('/api/suppliers/all', payload);
      
      // 💡 ดึงค่าจาก res.data ออกมาใช้งานได้เลย
      const cleanData = res?.data || [];
      setData(cleanData);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  // 💡 บล็อก useEffect ด้านล่างจะเรียกใช้ได้อย่างปลอดภัย ไร้เส้นเหลืองเตือน
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenEdit = (item: SupplierRow) => {
    setFormData({
      id: item.id,
      supplier_name: item.supplier_name,
      phone: item.phone || '',
      address: item.address || '',
      status: item.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      if (formData.id) {
        // ใช้ Method PATCH ตามมาตรฐาน apiClient ของระบบเดิม
        await apiClient.patch(`/api/suppliers/${formData.id}`, formData);
      } else {
        await apiClient.post('/api/suppliers', formData);
      }

      setFormData(initialFormData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Supplier save failed:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar ค้นหาและปุ่มสร้างไอเทม */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <input
          type="text"
          placeholder="ค้นหาชื่อผู้จัดจำหน่าย..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-xs px-3 py-1.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-black font-semibold"
        />
        <button
          onClick={() => { 
            setFormData(initialFormData);
            setIsModalOpen(true); 
          }}
          className="w-full sm:w-auto px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-zinc-800 transition-all"
        >
          + เพิ่มผู้จัดจำหน่าย
        </button>
      </div>

      {/* ตารางแสดงผลผู้จัดจำหน่าย */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase">
                <th className="p-3">ชื่อผู้จัดจำหน่าย</th>
                <th className="p-3">เบอร์โทรศัพท์</th>
                <th className="p-3">ที่อยู่</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-zinc-400 font-bold animate-pulse">กำลังโหลดข้อมูลผู้จัดจำหน่าย...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-zinc-400 font-bold">ไม่พบข้อมูลผู้จัดจำหน่ายในระบบ</td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50">
                    <td className="p-3 font-bold text-zinc-900">{item.supplier_name}</td>
                    <td className="p-3 font-mono">{item.phone || '-'}</td>
                    <td className="p-3 truncate max-w-xs" title={item.address}>{item.address || '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${item.status === 'ACTIVE' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleOpenEdit(item)} className="font-bold px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-all">
                        แก้ไข
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popup Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-black border-b pb-2">{formData.id ? 'แก้ไขผู้จัดจำหน่าย' : 'เพิ่มผู้จัดจำหน่ายใหม่'}</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">ชื่อบริษัท / ผู้จัดจำหน่าย *</label>
              <input type="text" required value={formData.supplier_name} onChange={(e) => setFormData({...formData, supplier_name: e.target.value})} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold" />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">เบอร์ติดต่อ</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold font-mono" />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">ที่อยู่</label>
              <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold h-16 resize-none" />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">สถานะ</label>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-bold">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button 
                type="button" 
                disabled={isSubmitting} 
                onClick={() => { setFormData(initialFormData); setIsModalOpen(false); }} 
                className="px-4 py-1.5 border border-zinc-200 text-xs font-bold rounded-xl hover:bg-zinc-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="px-4 py-1.5 bg-black text-white text-xs font-black rounded-xl hover:bg-zinc-800 disabled:bg-zinc-400 transition-all"
              >ปไ
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}