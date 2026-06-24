import { unitRepository } from './unit.repository';
import type { Units } from './entities/unit.entities';
import type { CreateUnitPayload, UpdateUnitPayload } from './dto/input-unit.dto';
import { UnitNotFoundError } from './unit.error';
import { inventoryRepository } from '../inventories/inventory.repository';
import { InventoryUsingUnit } from '../inventories/inventory.error';

export const unitsService = {
  async getUnit(id: string): Promise<Units> {
    const unit = await unitRepository.findById(id);
    if (!unit) {
      throw new UnitNotFoundError();
    }
    return unit;
  },

  async listUnits(page: number, limit: number) {
    const { data, total } = await unitRepository.findAll(page, limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async createUnit(data: CreateUnitPayload): Promise<Units> {
    return await unitRepository.create(data);
  },

  async updateUnit(id: string, data: UpdateUnitPayload): Promise<Units> {
    const updated = await unitRepository.update(id, data);
    if (!updated) {
      throw new UnitNotFoundError();
    }
    return updated;
  },

  async deleteUnit(id: string): Promise<void> {
    const existInventory = await inventoryRepository.existWithUnit(id);
    if (!existInventory) {
      const deleted = await unitRepository.delete(id);
      if (!deleted) {
        throw new UnitNotFoundError();
      }
    } else {
      throw new InventoryUsingUnit;
    }
  },
};