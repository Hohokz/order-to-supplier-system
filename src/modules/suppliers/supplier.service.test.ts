import { describe, it, expect, vi, beforeEach } from 'vitest';
import { suppliersService } from './supplier.service';
import { supplierRepository } from './supplier.repository';
import { SupplierNotFoundError } from './supplier.error';
import type { Supplier } from './entities/supplier.entities';
import { inventoryRepository } from '../inventories/inventory.repository';

// 1. Mock Repository
vi.mock('./supplier.repository', () => ({
  supplierRepository: {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../inventories/inventory.repository', () => ({
  inventoryRepository: {
    existWithSupplier: vi.fn(),
  },
}));

// 2. Factory Function สำหรับสร้าง Mock Data
function createMockSupplier(overrides: Partial<Supplier> = {}): Supplier {
  const now = new Date();

  return {
    id: 'supplier-1',
    supplier_name: 'บริษัท ทดสอบ จำกัด',
    contract_person: 'สมชาย ใจดี',
    phone: '0812345678',
    email: 'somchai@example.com',
    address: '123 ถ.สุขุมวิท กรุงเทพฯ',
    tax_id: '0105555555555',
    status: 'ACTIVE',
    created_by: 'admin-1',
    updated_by: 'admin-1',
    created_date: now,
    updated_date: now,
    ...overrides,
  };
}

describe('suppliersService', () => {
  // เคลียร์ Mock ทุกครั้งก่อนเริ่มรันแต่ละ Test Case
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryRepository.existWithSupplier).mockResolvedValue(false);
  });

  describe('getSupplier', () => {
    it('returns supplier when it exists', async () => {
      const mockSupplier = createMockSupplier();
      vi.mocked(supplierRepository.findById).mockResolvedValue(mockSupplier);

      const result = await suppliersService.getSupplier('supplier-1');

      expect(supplierRepository.findById).toHaveBeenCalledWith('supplier-1');
      expect(result.id).toBe('supplier-1');
      expect(result.supplier_name).toBe('บริษัท ทดสอบ จำกัด');
    });

    it('throws SupplierNotFoundError when supplier does not exist', async () => {
      vi.mocked(supplierRepository.findById).mockResolvedValue(null);

      await expect(suppliersService.getSupplier('missing-id')).rejects.toThrow(
        SupplierNotFoundError
      );
      expect(supplierRepository.findById).toHaveBeenCalledWith('missing-id');
    });
  });

  describe('listSuppliers', () => {
    it('returns paginated supplier list with correct totalPages calculation', async () => {
      const mockSuppliers = [createMockSupplier(), createMockSupplier({ id: 'supplier-2' })];
      
      vi.mocked(supplierRepository.findAll).mockResolvedValue({
        data: mockSuppliers,
        total: 15, // สมมติว่ามีข้อมูลทั้งหมด 15 รายการ
      });

      const result = await suppliersService.listSuppliers(1, 10);

      expect(supplierRepository.findAll).toHaveBeenCalledWith(1, 10, undefined);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(15);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(2); // Math.ceil(15 / 10)
    });

    it('returns empty list when there are no suppliers', async () => {
      vi.mocked(supplierRepository.findAll).mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await suppliersService.listSuppliers(1, 10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('createSupplier', () => {
    it('creates and returns a new supplier successfully', async () => {
      const payload = {
        supplier_name: 'บริษัท ใหม่ จำกัด',
        contract_person: 'สมหมาย',
        phone: '0899999999',
        email: 'sommai@example.com',
        address: 'เชียงใหม่',
        tax_id: '1234567890123',
        status: 'ACTIVE' as const,
        createdBy: 'admin-1',
      };

      const expectedCreatedSupplier = createMockSupplier({ ...payload });
      vi.mocked(supplierRepository.create).mockResolvedValue(expectedCreatedSupplier);

      const result = await suppliersService.createSupplier(payload);

      expect(supplierRepository.create).toHaveBeenCalledWith(payload);
      expect(result.supplier_name).toBe('บริษัท ใหม่ จำกัด');
      expect(result.id).toBe('supplier-1'); // อ้างอิงจาก factory
    });
  });

  describe('updateSupplier', () => {
    it('updates fields successfully when supplier exists', async () => {
      const payload = {
        supplier_name: 'บริษัท อัปเดต จำกัด',
        status: 'CHANGED' as const,
        updatedBy: 'admin-2',
      };

      const expectedUpdatedSupplier = createMockSupplier({ ...payload });
      vi.mocked(supplierRepository.update).mockResolvedValue(expectedUpdatedSupplier);

      // @ts-expect-error ปล่อยผ่าน Type เผื่อ payload ส่งไปไม่ครบทุกฟิลด์ตาม DTO
      const result = await suppliersService.updateSupplier('supplier-1', payload);

      expect(supplierRepository.update).toHaveBeenCalledWith('supplier-1', payload);
      expect(result.supplier_name).toBe('บริษัท อัปเดต จำกัด');
      expect(result.status).toBe('CHANGED');
    });

    it('throws SupplierNotFoundError when target supplier does not exist', async () => {
      vi.mocked(supplierRepository.update).mockResolvedValue(null);

      const payload = {
        supplier_name: 'บริษัท อัปเดต จำกัด',
        updatedBy: 'admin-1',
      };

      // @ts-expect-error: intentional partial payload for test
      await expect(suppliersService.updateSupplier('missing-id', payload)).rejects.toThrow(
        SupplierNotFoundError
      );
      expect(supplierRepository.update).toHaveBeenCalledWith('missing-id', payload);
    });
  });

  describe('deleteSupplier', () => {
    it('deletes the target supplier successfully', async () => {
      vi.mocked(supplierRepository.delete).mockResolvedValue(true);

      await suppliersService.deleteSupplier('supplier-1');

      expect(supplierRepository.delete).toHaveBeenCalledWith('supplier-1');
    });

    it('throws SupplierNotFoundError when target does not exist', async () => {
      vi.mocked(supplierRepository.delete).mockResolvedValue(false);

      await expect(suppliersService.deleteSupplier('missing-id')).rejects.toThrow(
        SupplierNotFoundError
      );
      expect(supplierRepository.delete).toHaveBeenCalledWith('missing-id');
    });
  });
});