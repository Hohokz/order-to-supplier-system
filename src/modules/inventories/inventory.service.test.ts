import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inventoriesService } from './inventory.service';
import { inventoryRepository } from './inventory.repository';
import { InventoryNotFoundError } from './inventory.error';
import type { Inventory } from './entities/inventory.entities';

// 1. Mock Repository
vi.mock('./inventory.repository', () => ({
    inventoryRepository: {
        findById: vi.fn(),
        findAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

// 2. Factory Function สำหรับสร้าง Mock Data
function createMockInventory(overrides: Partial<Inventory> = {}): Inventory {
    const now = new Date();

    return {
        id: 'inv-1',
        inventory_name: 'วัตถุดิบ A',
        inventory_quantity: 100,
        unit_price: 50.5,
        status: 'ACTIVE',
        supplier_id: 'sup-1',
        unit_id: 'kg-1',
        delivery_when: '2026-06-20T10:00:00.000Z',
        created_by: 'admin-1',
        updated_by: 'admin-1',
        created_date: now,
        updated_date: now,
        supplier: {
            id: 'sup-1',
            supplier_name: 'Supplier A'
        },
        unit: {
            id: 'kg-1',
            unit_name: 'กิโลกรัม'
        },
        ...overrides,
    };
}

describe('inventoriesService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getInventory', () => {
        it('returns inventory when it exists', async () => {
            const mockInventory = createMockInventory();
            vi.mocked(inventoryRepository.findById).mockResolvedValue(mockInventory);

            const result = await inventoriesService.getInventory('inv-1');

            expect(inventoryRepository.findById).toHaveBeenCalledWith('inv-1');
            expect(result.inventory_name).toBe('วัตถุดิบ A');
        });

        it('throws InventoryNotFoundError when inventory does not exist', async () => {
            vi.mocked(inventoryRepository.findById).mockResolvedValue(null);

            await expect(inventoriesService.getInventory('missing-id')).rejects.toThrow(
                InventoryNotFoundError
            );
        });
    });

    describe('listInventories', () => {
        it('returns paginated inventory list', async () => {
            const mockInventories = [createMockInventory(), createMockInventory({ id: 'inv-2' })];

            vi.mocked(inventoryRepository.findAll).mockResolvedValue({
                data: mockInventories,
                total: 20,
            });

            const result = await inventoriesService.listInventories(1, 10);

            expect(inventoryRepository.findAll).toHaveBeenCalledWith(1, 10);
            expect(result.data).toHaveLength(2);
            expect(result.totalPages).toBe(2);
        });
    });

    describe('createInventory', () => {
        it('creates a new inventory successfully', async () => {
            const payload = {
                inventory_name: 'วัตถุดิบ B',
                inventory_quantity: 50,
                unit_price: 100,
                status: 'ACTIVE' as const,
                supplier_id: 'sup-1',
                unit_id: 'kg-1',
                delivery_when: '2026-06-25T10:00:00.000Z',
                createdBy: 'admin-1',
            };

            vi.mocked(inventoryRepository.create).mockResolvedValue(createMockInventory(payload));

            const result = await inventoriesService.createInventory(payload);

            expect(inventoryRepository.create).toHaveBeenCalledWith(payload);
            expect(result.inventory_name).toBe('วัตถุดิบ B');
        });
    });

    describe('updateInventory', () => {
        it('updates inventory successfully', async () => {
            const payload = {
                inventory_quantity: 80,
                updatedBy: 'admin-2',
            };

            vi.mocked(inventoryRepository.update).mockResolvedValue(
                createMockInventory({ inventory_quantity: 80 })
            );

            const result = await inventoriesService.updateInventory('inv-1', payload);

            expect(inventoryRepository.update).toHaveBeenCalledWith('inv-1', payload);
            expect(result.inventory_quantity).toBe(80);
        });

        it('throws InventoryNotFoundError if target does not exist', async () => {
            vi.mocked(inventoryRepository.update).mockResolvedValue(null);

            await expect(
                inventoriesService.updateInventory('missing-id', {
                    inventory_quantity: 10,
                    updatedBy: 'admin-1' // เพิ่มค่านี้เข้าไปครับ
                })
            ).rejects.toThrow(InventoryNotFoundError);
        });
    });

    describe('deleteInventory', () => {
        it('deletes inventory successfully', async () => {
            vi.mocked(inventoryRepository.delete).mockResolvedValue(true);

            await inventoriesService.deleteInventory('inv-1');

            expect(inventoryRepository.delete).toHaveBeenCalledWith('inv-1');
        });

        it('throws InventoryNotFoundError when deletion fails', async () => {
            vi.mocked(inventoryRepository.delete).mockResolvedValue(false);

            await expect(inventoriesService.deleteInventory('missing-id')).rejects.toThrow(
                InventoryNotFoundError
            );
        });
    });
});