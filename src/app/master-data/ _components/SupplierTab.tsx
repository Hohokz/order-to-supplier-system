'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useModal } from '@/context/ModalContext';

interface SupplierRow {
  id: string;
  supplier_name: string;
  contract_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_id?: string;
  status: string;
}

const initialFormData = {
  id: '',
  supplier_name: '',
  contract_person: '',
  phone: '',
  email: '',
  address: '',
  tax_id: '',
  status: 'ACTIVE'
};

export function SupplierTab() {
  const { showError, showSuccess } = useModal();
  const [data, setData] = useState<SupplierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const payload = {
        page: 1,
        limit: 100,
        filters: { supplierName: searchTerm }
      };

      const res = await apiClient.post<{ data?: SupplierRow[] }>('/api/suppliers/all', payload);
      const cleanData = res?.data || [];
      setData(cleanData);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      showError(message, 'ไม่สามารถดึงข้อมูลผู้จัดจำหน่ายได้');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenEdit = (item: SupplierRow) => {
    setFormData({
      id: item.id,
      supplier_name: item.supplier_name,
      contract_person: item.contract_person || '',
      phone: item.phone || '',
      email: item.email || '',
      address: item.address || '',
      tax_id: item.tax_id || '',
      status: item.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 💡 1. เพิ่ม Validate หน้าบ้าน สกัดก่อนส่งไปหลังบ้าน
      if (formData.tax_id && formData.tax_id.length > 13) {
        return alert('เลขประจำตัวผู้เสียภาษีต้องยาวไม่เกิน 13 หลักครับ');
      }

      setIsSubmitting(true);

      if (formData.id) {
        await apiClient.patch(`/api/suppliers/${formData.id}`, formData);
        showSuccess('แก้ไขข้อมูลผู้จัดจำหน่ายเรียบร้อยแล้ว');
      } else {
        await apiClient.post('/api/suppliers', formData);
        showSuccess('เพิ่มข้อมูลผู้จัดจำหน่ายเรียบร้อยแล้ว');
      }

      setFormData(initialFormData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Supplier save failed:', err);
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุจากเซิร์ฟเวอร์';
      showError(message, 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`คุณต้องการลบผู้จัดจำหน่าย "${name}" ใช่หรือไม่?`)) return;
    try {
      setIsLoading(true);
      await apiClient.delete(`/api/suppliers/${id}`);
      showSuccess('ลบข้อมูลผู้จัดจำหน่ายเรียบร้อยแล้ว');
      fetchData();
    } catch (err) {
      console.error('Delete supplier failed:', err);
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูล';
      showError(message, 'ไม่สามารถลบข้อมูลได้ (ผู้จัดจำหน่ายนี้อาจถูกผูกใช้งานอยู่ในคลังสินค้า)');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = data.filter(item =>
    item.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <input
          type="text"
          placeholder="ค้นหาชื่อผู้จัดจำหน่าย..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-md px-4 py-2 border border-zinc-200 rounded-full text-sm focus:outline-none focus:border-black font-medium"
        />
        <button
          onClick={() => {
            setFormData(initialFormData);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto px-5 py-2 bg-black text-white text-sm font-bold rounded-full hover:bg-zinc-800 transition-all shadow-sm"
        >
          + เพิ่มผู้จัดจำหน่าย
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-400">
              <th className="py-4 px-2 font-medium">ชื่อผู้จัดจำหน่าย</th>
              <th className="py-4 px-2 font-medium">ผู้ติดต่อ</th>
              <th className="py-4 px-2 font-medium">เบอร์โทรศัพท์</th>
              <th className="py-4 px-2 font-medium">เลขผู้เสียภาษี</th>
              <th className="py-4 px-2 font-medium text-center">Defสิทธิ์</th>
              <th className="py-4 px-2 font-medium text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-400 font-bold animate-pulse">กำลังโหลดข้อมูลผู้จัดจำหน่าย...</td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-400 font-bold">ไม่พบข้อมูลผู้จัดจำหน่ายในระบบ</td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="py-4 px-2 font-bold text-zinc-900">{item.supplier_name}</td>
                  <td className="py-4 px-2 text-zinc-600 font-medium">{item.contract_person || '-'}</td>
                  <td className="py-4 px-2 font-mono text-zinc-600">{item.phone || '-'}</td>
                  <td className="py-4 px-2 font-mono text-zinc-500 text-xs">{item.tax_id || '-'}</td>
                  <td className="py-4 px-2 text-center">
                    <span className={`px-3 py-1 text-[11px] font-black rounded-full ${item.status === 'ACTIVE' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(item)} className="font-bold px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-black transition-all">
                        แก้ไข
                      </button>
                      <button onClick={() => handleDelete(item.id, item.supplier_name)} className="font-bold px-3 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-all">
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
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-black border-b pb-2">{formData.id ? 'แก้ไขผู้จัดจำหน่าย' : 'เพิ่มผู้จัดจำหน่ายใหม่'}</h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">ชื่อบริษัท / ผู้จัดจำหน่าย *</label>
              <input type="text" required disabled={isSubmitting} value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">ชื่อผู้ติดต่อ</label>
                <input type="text" disabled={isSubmitting} value={formData.contract_person} onChange={(e) => setFormData({ ...formData, contract_person: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">เบอร์ติดต่อ</label>
                <input type="text" disabled={isSubmitting} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold font-mono disabled:bg-zinc-50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">อีเมล</label>
                <input type="email" disabled={isSubmitting} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold font-mono disabled:bg-zinc-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">เลขประจำตัวผู้เสียภาษี (สูงสุด 13 หลัก)</label>
                {/* 💡 2. เพิ่ม maxLength={13} ที่ตัว Input ล็อกไม่ให้พนักงานกดพิมพ์เกินตั้งแต่หน้าจอ */}
                <input
                  type="text"
                  maxLength={13}
                  disabled={isSubmitting}
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value.replace(/\D/g, '') })} // ล็อกให้พิมพ์เฉพาะตัวเลขเท่านั้น
                  className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold font-mono disabled:bg-zinc-50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">ที่อยู่</label>
              <textarea disabled={isSubmitting} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold h-16 resize-none disabled:bg-zinc-50" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">สถานะ</label>
              <select disabled={isSubmitting} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-bold disabled:bg-zinc-50">
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