'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { MasterInventoryRow } from '../../../types/inventory';
import { useModal } from '@/context/ModalContext';
import { extractErrorMessage } from '@/lib/error';
import { useAuth } from '@/context/AuthContext';

interface UnitRow {
  id: string;
  unit_name: string;
}

interface SupplierRow {
  id: string;
  supplier_name: string;
}

const initialFormData = {
  id: '',
  seq: '',
  inventory_name: '',
  inventory_quantity: '',
  unit_price: '',
  safety_quantity: '',
  unit_id: '',
  supplier_id: '',
  status: 'ACTIVE',
  remark: ''
};

export function InventoryTab() {
  const { user } = useAuth();
  const { showError, showSuccess } = useModal();
  const [data, setData] = useState<MasterInventoryRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [activeRemarkId, setActiveRemarkId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.post<MasterInventoryRow[]>('/api/inventories/master', {});
      setData(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'ไม่สามารถเรียกข้อมูลวัตถุดิบได้');
      showError(message, 'ไม่สามารถเรียกข้อมูลวัตถุดิบได้');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const fetchMetadata = useCallback(async () => {
    try {
      const [unitRes, supplierRes] = await Promise.all([
        apiClient.get<{ data?: UnitRow[] } | UnitRow[]>('/api/units'),
        apiClient.post<{ data?: SupplierRow[] }>('/api/suppliers/all', { page: 1, limit: 100 })
      ]);
      let cleanUnits: UnitRow[] = [];
      if (unitRes && 'data' in unitRes && Array.isArray(unitRes.data)) {
        cleanUnits = unitRes.data;
      } else if (Array.isArray(unitRes)) {
        cleanUnits = unitRes;
      }
      setUnits(cleanUnits);
      setSuppliers(supplierRes?.data || []);
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'ไม่สามารถเรียกข้อมูลตัวเลือกได้');
      showError(message, 'ไม่สามารถเรียกข้อมูลตัวเลือกได้');
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
    fetchMetadata();
  }, [fetchData, fetchMetadata]);

  const handleOpenEdit = (item: MasterInventoryRow) => {
    setFormData({
      id: item.id,
      seq: item.seq?.toString() || '0',
      inventory_name: item.inventory_name,
      inventory_quantity: item.inventory_quantity?.toString() || '0',
      unit_price: item.unit_price?.toString() || '0',
      safety_quantity: item.safety_quantity?.toString() || '0',
      unit_id: item.unit?.id || '',
      supplier_id: item.supplier?.id || '',
      status: item.status || 'ACTIVE',
      remark: item.remark || ''
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
        seq: Number(formData.seq || 0),
        unit_price: Number(formData.unit_price || 0),
        safety_quantity: Number(formData.safety_quantity || 0),
        unit_id: formData.unit_id,
        supplier_id: formData.supplier_id,
        status: formData.status,
        remark: formData.remark || ''
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
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'ไม่สามารถบันทึกข้อมูลวัตถุดิบได้');
      showError(message, 'ไม่สามารถบันทึกข้อมูลวัตถุดิบได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`คุณต้องการลบวัตถุดิบ "${name}" ใช่หรือไม่?`)) return;
    try {
      setIsLoading(true);
      await apiClient.delete(`/api/inventories/${id}`);
      showSuccess('ลบข้อมูลวัตถุดิบเรียบร้อยแล้ว');
      fetchData();
    } catch (err: unknown) {
      showError(extractErrorMessage(err), 'ลบไม่สำเร็จ');
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
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <input
          type="text"
          placeholder="ค้นหาชื่อวัตถุดิบ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-md px-4 py-2 border border-zinc-200 rounded-full text-sm focus:outline-none focus:border-black font-medium"
        />
        <button
          onClick={() => { setFormData(initialFormData); setIsModalOpen(true); }}
          className="w-full sm:w-auto px-5 py-2 bg-black text-white text-sm font-bold rounded-full hover:bg-zinc-800 transition-all shadow-sm"
        >
          + เพิ่มวัตถุดิบใหม่
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-400">
              <th className="py-4 px-2 font-medium">ชื่อวัตถุดิบ</th>
              <th className="py-4 px-2 font-medium">ผู้จัดจำหน่าย</th>
              <th className="py-4 px-2 font-medium text-center">หน่วยนับ</th>
              {user?.user_role === 'APPROVER' && (
                <th className="py-4 px-2 font-medium text-center">จำนวนในคลัง</th>
              )}
              <th className="py-4 px-2 font-medium text-center">สถานะ</th>
              <th className="py-4 px-2 font-medium text-right">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-800">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="py-4 px-2 font-bold text-zinc-900">{item.inventory_name}</td>
                <td className="py-4 px-2 text-zinc-600">{item.supplier?.supplier_name || '-'}</td>
                <td className="py-4 px-2 text-center font-mono text-zinc-600">{item.unit?.unit_name}</td>
                {user?.user_role === 'APPROVER' && (
                  <td className="py-4 px-2 text-center font-mono font-bold text-zinc-900">{item.inventory_quantity ?? 0}</td>
                )}
                <td className="py-4 px-2 text-center">
                  <span className={`px-3 py-1 text-[11px] font-black rounded-full ${item.status === 'ACTIVE' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                    {item.status}
                  </span>
                </td>
                <td className="py-4 px-2 text-center w-8 relative">
                  <div onClick={() => setActiveRemarkId(activeRemarkId === item.id ? null : item.id)} className="cursor-pointer inline-block">
                    <svg className={`w-4 h-4 text-zinc-300 transition-transform ${activeRemarkId === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  {activeRemarkId === item.id && (
                    <div className="absolute top-12 right-0 z-[100] w-72">
                      <div className="relative bg-white border border-zinc-200 p-4 rounded-2xl shadow-xl">
                        <div className="text-xs text-zinc-600 text-left"><span className="font-black text-black block mb-1">หมายเหตุ:</span><p>{item.remark || "ไม่มีหมายเหตุ"}</p></div>
                      </div>
                    </div>
                  )}
                </td>
                <td className="py-4 px-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenEdit(item)} className="font-bold px-3 py-1.5 rounded-lg border border-zinc-200 text-xs">แก้ไข</button>
                    <button onClick={() => handleDelete(item.id, item.inventory_name)} className="font-bold px-3 py-1.5 rounded-lg border border-red-100 text-red-600 text-xs">ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-black border-b pb-2">{formData.id ? 'แก้ไขข้อมูลวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่เข้าคลัง'}</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">ชื่อวัตถุดิบ *</label>
              <input type="text" required disabled={isSubmitting} value={formData.inventory_name} onChange={(e) => setFormData({ ...formData, inventory_name: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">จำนวนเริ่มต้น *</label>
                <input type="number" required min="0" disabled={isSubmitting} value={formData.inventory_quantity} onChange={(e) => setFormData({ ...formData, inventory_quantity: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold font-mono disabled:bg-zinc-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">หน่วยนับ *</label>
                <select required disabled={isSubmitting} value={formData.unit_id} onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-black font-bold disabled:bg-zinc-50">
                  <option value="">เลือกหน่วยนับ</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">จุดสั่งซื้อขั้นต่ำ (Safety) *</label>
                <input type="number" required min="0" disabled={isSubmitting} value={formData.safety_quantity} onChange={(e) => setFormData({ ...formData, safety_quantity: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold font-mono disabled:bg-zinc-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">สถานะคลังสินค้า</label>
                <select disabled={isSubmitting} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-bold disabled:bg-zinc-50">
                  <option value="ACTIVE">ACTIVE (ปกติ)</option>
                  <option value="OUTSTOCK">OUTSTOCK (ของหมด)</option>
                  <option value="INACTIVE">INACTIVE (ปิดใช้งาน)</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">ผู้จัดจำหน่าย (Supplier) *</label>
              <select required disabled={isSubmitting} value={formData.supplier_id} onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })} className="w-full border border-zinc-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-black font-bold disabled:bg-zinc-50">
                <option value="">เลือกผู้จัดจำหน่าย</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">หมายเหตุ (Remark)</label>
              <textarea disabled={isSubmitting} value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..." rows={2} className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold disabled:bg-zinc-50 resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" disabled={isSubmitting} onClick={() => { setFormData(initialFormData); setIsModalOpen(false); }} className="px-4 py-1.5 border border-zinc-200 text-xs font-bold rounded-xl hover:bg-zinc-50 disabled:opacity-50">ยกเลิก</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-black text-white text-xs font-black rounded-xl hover:bg-zinc-800 disabled:bg-zinc-400 transition-all">{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}