import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unitsService } from './unit.service';
import { unitRepository } from './unit.repository';
import { UnitNotFoundError } from './unit.error';
import type { Units } from './entities/unit.entities';
import { inventoryRepository } from '../inventories/inventory.repository';

// 1. Mock Repository
vi.mock('./unit.repository', () => ({
  unitRepository: {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../inventories/inventory.repository', () => ({
  inventoryRepository: {
    existWithUnit: vi.fn(),
  },
}));

// 2. Factory Function สำหรับสร้าง Mock Data
function createMockUnit(overrides: Partial<Units> = {}): Units {
  const now = new Date();

  return {
    id: 'KG',
    unit_name: 'กิโลกรัม',
    created_by: 'admin-1',
    created_date: now,
    ...overrides,
  };
}

describe('unitsService', () => {
  // เคลียร์ Mock ทุกครั้งก่อนเริ่มรันแต่ละ Test Case
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryRepository.existWithUnit).mockResolvedValue(false);
  });

  describe('getUnit', () => {
    it('returns unit when it exists', async () => {
      const mockUnit = createMockUnit();
      vi.mocked(unitRepository.findById).mockResolvedValue(mockUnit);

      const result = await unitsService.getUnit('KG');

      expect(unitRepository.findById).toHaveBeenCalledWith('KG');
      expect(result.id).toBe('KG');
      expect(result.unit_name).toBe('กิโลกรัม');
    });

    it('throws UnitNotFoundError when unit does not exist', async () => {
      vi.mocked(unitRepository.findById).mockResolvedValue(null);

      await expect(unitsService.getUnit('missing-id')).rejects.toThrow(
        UnitNotFoundError
      );
      expect(unitRepository.findById).toHaveBeenCalledWith('missing-id');
    });
  });

  describe('listUnits', () => {
    it('returns paginated unit list with correct totalPages calculation', async () => {
      const mockUnits = [createMockUnit(), createMockUnit({ id: 'BOX', unit_name: 'กล่อง' })];
      
      vi.mocked(unitRepository.findAll).mockResolvedValue({
        data: mockUnits,
        total: 25, // สมมติว่ามีข้อมูลทั้งหมด 25 รายการ
      });

      const result = await unitsService.listUnits(1, 10);

      expect(unitRepository.findAll).toHaveBeenCalledWith(1, 10);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3); // Math.ceil(25 / 10)
    });

    it('returns empty list when there are no units', async () => {
      vi.mocked(unitRepository.findAll).mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await unitsService.listUnits(1, 10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('createUnit', () => {
    it('creates and returns a new unit successfully', async () => {
      const payload = {
        unit: 'KG',
        unit_name: 'กิโลกรัม',
        createdBy: 'admin-1',
      };

      const expectedCreatedUnit = createMockUnit({ ...payload });
      vi.mocked(unitRepository.create).mockResolvedValue(expectedCreatedUnit);

      const result = await unitsService.createUnit(payload);

      expect(unitRepository.create).toHaveBeenCalledWith(payload);
      expect(result.unit_name).toBe('กิโลกรัม');
      expect(result.id).toBe('KG');
    });
  });

  describe('updateUnit', () => {
    it('updates fields successfully when unit exists', async () => {
      const payload = {
        unit_name: 'กิโลกรัม (อัปเดต)',
        updatedBy: 'admin-2',
      };

      const expectedUpdatedUnit = createMockUnit({ ...payload });
      vi.mocked(unitRepository.update).mockResolvedValue(expectedUpdatedUnit);

      const result = await unitsService.updateUnit('KG', payload);

      expect(unitRepository.update).toHaveBeenCalledWith('KG', payload);
      expect(result.unit_name).toBe('กิโลกรัม (อัปเดต)');
    });

    it('throws UnitNotFoundError when target unit does not exist', async () => {
      vi.mocked(unitRepository.update).mockResolvedValue(null);

      const payload = {
        unit_name: 'กิโลกรัม (อัปเดต)',
        updatedBy: 'admin-1',
      };

      await expect(unitsService.updateUnit('missing-id', payload)).rejects.toThrow(
        UnitNotFoundError
      );
      expect(unitRepository.update).toHaveBeenCalledWith('missing-id', payload);
    });
  });

  describe('deleteUnit', () => {
    it('deletes the target unit successfully', async () => {
      vi.mocked(unitRepository.delete).mockResolvedValue(true);

      await unitsService.deleteUnit('KG');

      expect(unitRepository.delete).toHaveBeenCalledWith('KG');
    });

    it('throws UnitNotFoundError when target does not exist', async () => {
      vi.mocked(unitRepository.delete).mockResolvedValue(false);

      await expect(unitsService.deleteUnit('missing-id')).rejects.toThrow(
        UnitNotFoundError
      );
      expect(unitRepository.delete).toHaveBeenCalledWith('missing-id');
    });
  });
});