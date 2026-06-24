'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { MasterInventoryResponse, MasterInventoryRow } from '../../../types/inventory';
import { useModal } from '@/context/ModalContext';

const initialFormData = {
  id: '',
  inventory_name: '',
  inventory_quantity: '',
  unit_price: '',
  safety_quantity: '',
  unit_id: '',
  supplier_id: '',
  status: 'ACTIVE'
};

export function InventoryTab() {
  const { showError, showSuccess } = useModal();
  const [data, setData] = useState<MasterInventoryRow[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; supplier_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  // ดึงข้อมูลวัตถุดิบระดับ Master
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.post<MasterInventoryResponse[]>('/api/inventories/master', {});
      setData(res[0]?.rows || []);
    } catch (err) {
      console.error('Error fetching inventory master:', err);
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      showError(message, 'ไม่สามารถเรียกข้อมูลวัตถุดิบได้');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // ดึงข้อมูลตัวเลือก (Units & Suppliers) มาป้อนลง Dropdown Select
  const fetchMetadata = useCallback(async () => {
    try {
      const [unitRes, supplierRes] = await Promise.all([
        apiClient.get<{ data?: any[] } | any[]>('/api/units'),
        apiClient.post<{ data?: any[] }>('/api/suppliers/all', { page: 1, limit: 100 })
      ]);

      let cleanUnits = [];
      if (unitRes && 'data' in unitRes && Array.isArray(unitRes.data)) {
        cleanUnits = unitRes.data;
      } else if (Array.isArray(unitRes)) {
        cleanUnits = unitRes;
      }
      setUnits(cleanUnits);
      setSuppliers(supplierRes?.data || []);
    } catch (err) {
      console.error('Failed to fetch master metadata:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchMetadata();
  }, [fetchData, fetchMetadata]);

  const handleOpenEdit = (item: MasterInventoryRow) => {
    setFormData({
      id: item.id,
      inventory_name: item.inventory_name,
      inventory_quantity: item.inventory_quantity?.toString() || '0',
      unit_price: item.unit_price?.toString() || '0',
      safety_quantity: item.safety_quantity?.toString() || '0',
      unit_id: item.unit?.id || '',
      supplier_id: item.supplier?.id || '',
      status: item.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      const payload = {
        inventory_name: formData.inventory_name,
        inventory_quantity: Number(formData.inventory_quantity || 0),
        unit_price: Number(formData.unit_price || 0),
        safety_quantity: Number(formData.safety_quantity || 0),
        unit_id: formData.unit_id,
        supplier_id: formData.supplier_id,
        status: formData.status
      };

      if (formData.id) {
        await apiClient.patch(`/api/inventories/${formData.id}`, payload);
        showSuccess('แก้ไขข้อมูลวัตถุดิบเรียบร้อยแล้ว');
      } else {
        await apiClient.post('/api/inventories', payload);
        showSuccess('เพิ่มวัตถุดิบใหม่เข้าคลังเรียบร้อยแล้ว');
      }

      setFormData(initialFormData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุจากเซิร์ฟเวอร์';
      showError(message, 'ไม่สามารถบันทึกข้อมูลวัตถุดิบได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 💡 ฟังก์ชันลบวัตถุดิบ ยิงหา Endpoint ของคอนโทรลเลอร์โดยตรง
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`คุณต้องการลบวัตถุดิบ "${name}" ใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนคืนได้)`)) return;

    try {
      setIsLoading(true);
      await apiClient.delete(`/api/inventories/${id}`);
      showSuccess('ลบข้อมูลวัตถุดิบออกจากระบบเรียบร้อยแล้ว');
      fetchData(); // รีเฟรชตารางใหม่
    } catch (err) {
      console.error('Delete failed:', err);
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุจากเซิร์ฟเวอร์';
      showError(message, 'ไม่สามารถลบข้อมูลวัตถุดิบได้');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = data.filter(item =>
    item.inventory_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="text-center py-8 text-xs font-bold text-zinc-400 animate-pulse">กำลังโหลดข้อมูลคลังสินค้า...</div>;

  return (
    <div className="space-y-6 pt-4">
      {/* Action Bar ค้นหาและปุ่มสร้างไอเทม */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <input
          type="text"
          placeholder="ค้นหาชื่อวัตถุดิบ..."
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
          + เพิ่มวัตถุดิบใหม่
        </button>
      </div>

      {/* ตารางแสดงผลสไตล์โปร่งสบายตา */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-400">
              <th className="py-4 px-2 font-medium">ชื่อวัตถุดิบ</th>
              <th className="py-4 px-2 font-medium">ผู้จัดจำหน่าย</th>
              <th className="py-4 px-2 font-medium text-center">หน่วยนับ</th>
              <th className="py-4 px-2 font-medium text-center">จำนวนในคลัง</th>
              <th className="py-4 px-2 font-medium text-center">ราคา/หน่วย</th>
              <th className="py-4 px-2 font-medium text-center">สถานะ</th>
              <th className="py-4 px-2 font-medium text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-800">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-400 font-bold">ไม่พบข้อมูลวัตถุดิบในระบบ</td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="py-4 px-2 font-bold text-zinc-900">{item.inventory_name}</td>
                  <td className="py-4 px-2 text-zinc-600">{item.supplier?.supplier_name || '-'}</td>
                  <td className="py-4 px-2 text-center font-mono text-zinc-600">{item.unit?.unit_name} ({item.unit?.id})</td>
                  <td className="py-4 px-2 text-center font-mono font-bold text-zinc-900">{item.inventory_quantity ?? 0}</td>
                  <td className="py-4 px-2 text-center font-mono font-bold text-zinc-600">{parseFloat(item.unit_price || '0').toFixed(2)} บาท</td>
                  <td className="py-4 px-2 text-center">
                    <span className={`px-3 py-1 text-[11px] font-black rounded-full transition-all
                      ${item.status === 'ACTIVE' ? 'bg-zinc-900 text-white' : item.status === 'OUTSTOCK' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-400'}`}>
                      {item.status}
                    </span>
                  </td>
                  {/* 💡 อัปเดตคอลัมน์การจัดการให้มีปุ่ม แก้ไข และ ลบ เคียงคู่กันอย่างสวยงาม */}
                  <td className="py-4 px-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="font-bold px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-black transition-all"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.inventory_name)}
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
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-black border-b pb-2">{formData.id ? 'แก้ไขข้อมูลวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่เข้าคลัง'}</h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">ชื่อวัตถุดิบ *</label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.inventory_name}
                onChange={(e) => setFormData({ ...formData, inventory_name: e.target.value })}
                className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">จำนวนเริ่มต้น *</label>
                <input
                  type="number"
                  required
                  min="0"
                  disabled={isSubmitting}
                  value={formData.inventory_quantity}
                  onChange={(e) => setFormData({ ...formData, inventory_quantity: e.target.value })}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold font-mono disabled:bg-zinc-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">ราคาต่อหน่วย (บาท) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  disabled={isSubmitting}
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold font-mono disabled:bg-zinc-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">หน่วยนับ *</label>
                <select
                  required
                  disabled={isSubmitting}
                  value={formData.unit_id}
                  onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                  className="w-full border border-zinc-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-black font-bold disabled:bg-zinc-50"
                >
                  <option value="">เลือกหน่วยนับ</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.unit_name} ({u.id})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">จุดสั่งซื้อขั้นต่ำ (Safety) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  disabled={isSubmitting}
                  value={formData.safety_quantity}
                  onChange={(e) => setFormData({ ...formData, safety_quantity: e.target.value })}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold font-mono disabled:bg-zinc-50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">ผู้จัดจำหน่าย (Supplier) *</label>
              <select
                required
                disabled={isSubmitting}
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full border border-zinc-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-black font-bold disabled:bg-zinc-50"
              >
                <option value="">เลือกผู้จัดจำหน่าย</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">สถานะคลังสินค้า</label>
              <select
                disabled={isSubmitting}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-bold disabled:bg-zinc-50"
              >
                <option value="ACTIVE">ACTIVE (ปกติ)</option>
                <option value="OUTSTOCK">OUTSTOCK (ของหมด)</option>
                <option value="INACTIVE">INACTIVE (ปิดใช้งาน)</option>
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
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}