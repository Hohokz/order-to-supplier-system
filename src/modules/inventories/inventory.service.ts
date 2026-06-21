import { inventoryRepository } from './inventory.repository';
import { supplierRepository } from '../suppliers/supplier.repository';
import { unitRepository } from '../units/unit.repository';
import type { Inventory } from './entities/inventory.entities';
import type { CreateInventoryPayload, UpdateInventoryPayload } from './dto/input-inventory.dto';
import { InventoryNameAlreadyExist, InventoryNotFoundError } from './inventory.error';
import { SupplierNotFoundError } from '../suppliers/supplier.error';
import { UnitNotFoundError } from '../units/unit.error';

export const inventoriesService = {
  async getInventory(id: string): Promise<Inventory> {
    const inventory = await inventoryRepository.findById(id);
    if (!inventory) {
      throw new InventoryNotFoundError();
    }
    return inventory;
  },

  async listInventories(
    page: number,
    limit: number,
    filters?: { inventoryName?: string; supplierName?: string, status?: string }
  ) {
    const { data, total } = await inventoryRepository.findAll(page, limit, filters);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async GetMasterInventories() {
    return await inventoryRepository.masterInventories();
  },

  async createInventory(data: CreateInventoryPayload): Promise<Inventory> {
    const existInventoryName = await inventoryRepository.existWithInventoryName(data.inventory_name);
    if (existInventoryName) {
      throw new InventoryNameAlreadyExist;
    }
    const existSupplier = await supplierRepository.existById(data.supplier_id);
    if (!existSupplier) {
      throw new SupplierNotFoundError;
    }
    const existUnit = await unitRepository.existById(data.unit_id);
    if (!existUnit) {
      throw new UnitNotFoundError;
    }
    return await inventoryRepository.create(data);
  },

  async updateInventory(id: string, data: UpdateInventoryPayload): Promise<Inventory> {
    const updated = await inventoryRepository.update(id, data);
    if (!updated) {
      throw new InventoryNotFoundError();
    }
    return updated;
  },

  async deleteInventory(id: string): Promise<void> {
    const deleted = await inventoryRepository.delete(id);
    if (!deleted) {
      throw new InventoryNotFoundError();
    }
  },
};