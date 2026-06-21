'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { MasterInventoryResponse, MasterInventoryRow } from '../../../types/inventory';

const initialFormData = {
  id: '',
  inventory_name: '',
  unit_id: '',
  supplier_id: '',
  status: 'ACTIVE'
};

export function InventoryTab() {
  const [data, setData] = useState<MasterInventoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // 💡 ประกาศสเตตล็อกปุ่มเซฟเรียบร้อย
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // 💡 เชื่อมโยงเข้าหาอินเตอร์เฟสหลัก สลัด unknown ทิ้ง ปลดบล็อกเอเรอร์ .rows
      const res = await apiClient.post<MasterInventoryResponse[]>('/api/inventories/master', {});
      setData(res[0]?.rows || []);
    } catch (err) {
      console.error('Error fetching inventory master:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const handleOpenEdit = (item: MasterInventoryRow) => {
    setFormData({
      id: item.id,
      inventory_name: item.inventory_name,
      unit_id: item.unit?.id || '',
      supplier_id: item.supplier?.id || '',
      status: item.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true); // 💡 สั่งเปิดโหลดดิ้งทันทีก่อนยิง API

      if (formData.id) {
        // 💡 เปลี่ยนจาก .put มาใช้ .patch เพื่อแก้ปัญหาคุณสมบัติ Method ขาดหายใน apiClient
        await apiClient.patch(`/api/inventories/${formData.id}`, formData);
      } else {
        // Mode: Create ยิงข้อมูลสร้างใหม่ปกติ
        await apiClient.post('/api/inventories', formData);
      }

      setFormData(initialFormData); // เคลียร์ฟอร์มป้องกัน UI ค้างค่าเดิม
      setIsModalOpen(false);
      fetchData(); // ดึงข้อมูลอัปเดตตารางใหม่ล่าสุด
    } catch (err) {
      console.error('Save failed:', err);
      alert('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false); // 💡 ปิดสเตตโหลดดิ้งปลดล็อกปุ่ม
    }
  };

  // คัดกรองข้อมูลค้นหา Real-time คอนโทรลผ่านหน้าด่านฝั่ง Client
  const filteredData = data.filter(item => 
    item.inventory_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="text-center py-8 text-xs font-bold text-zinc-400 animate-pulse">กำลังโหลดข้อมูลคลังสินค้า...</div>;

  return (
    <div className="space-y-4">
      {/* Action Bar ค้นหาและปุ่มสร้างไอเทม */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <input
          type="text"
          placeholder="ค้นหาชื่อวัตถุดิบ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-xs px-3 py-1.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-black font-semibold"
        />
        <button
          onClick={() => { 
            setFormData(initialFormData); // ล้างฟอร์มให้สะอาดก่อนเปิดโมดอลสร้างใหม่
            setIsModalOpen(true); 
          }}
          className="w-full sm:w-auto px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-zinc-800 transition-all"
        >
          + เพิ่มวัตถุดิบใหม่
        </button>
      </div>

      {/* ตารางแสดงผลระดับ Master บน Dashboard */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase">
                <th className="p-3">ชื่อวัตถุดิบ</th>
                <th className="p-3">ผู้จัดจำหน่าย</th>
                <th className="p-3 text-center">หน่วยนับ</th>
                <th className="p-3 text-center">ราคา/หน่วย</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700 text-xs">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-zinc-400 font-bold">ไม่พบข้อมูลวัตถุดิบในระบบ</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50">
                    <td className="p-3 font-bold text-zinc-900">{item.inventory_name}</td>
                    <td className="p-3 text-zinc-500">{item.supplier?.supplier_name || '-'}</td>
                    <td className="p-3 text-center font-mono">{item.unit?.unit_name} ({item.unit?.id})</td>
                    <td className="p-3 text-center font-mono font-bold text-zinc-600">{parseFloat(item.unit_price || '0').toFixed(2)} บาท</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-full 
                        ${item.status === 'ACTIVE' ? 'bg-zinc-900 text-white' : item.status === 'OUTSTOCK' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-400'}`}>
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
            <h3 className="text-sm font-black border-b pb-2">{formData.id ? 'แก้ไขข้อมูลวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่เข้าคลัง'}</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">ชื่อวัตถุดิบ *</label>
              <input
                type="text"
                required
                value={formData.inventory_name}
                onChange={(e) => setFormData({...formData, inventory_name: e.target.value})}
                className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">สถานะคลังสินค้า</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black font-bold"
                >
                  <option value="ACTIVE">ACTIVE (ปกติ)</option>
                  <option value="OUTSTOCK">OUTSTOCK (ของหมด)</option>
                  <option value="INACTIVE">INACTIVE (ปิดใช้งาน)</option>
                </select>
              </div>
            </div>

            {/* ปุ่ม Footer ควบคุมผ่าน IsSubmitting */}
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