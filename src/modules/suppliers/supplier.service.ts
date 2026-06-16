import { supplierRepository } from './supplier.repository';
import { Supplier } from './entities/supplier.entities';
import { CreateSupplierPayload, UpdateSupplierPayload } from './dto/input-supplier.dto';
import { SupplierNotFoundError } from './supplier.error';

export const suppliersService = {
  async getSupplier(id: string): Promise<Supplier> {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new SupplierNotFoundError();
    }
    return supplier;
  },

  async listSuppliers(page: number, limit: number) {
    const { data, total } = await supplierRepository.findAll(page, limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async createSupplier(data: CreateSupplierPayload): Promise<Supplier> {
    return await supplierRepository.create(data);
  },

  async updateSupplier(id: string, data: UpdateSupplierPayload): Promise<Supplier> {
    const updated = await supplierRepository.update(id, data);
    if (!updated) {
      throw new SupplierNotFoundError();
    }
    return updated;
  },

  async deleteSupplier(id: string): Promise<void> {
    const deleted = await supplierRepository.delete(id);
    if (!deleted) {
      throw new SupplierNotFoundError();
    }
  },
};