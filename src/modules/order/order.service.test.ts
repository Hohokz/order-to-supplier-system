import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderService } from './order.service';
import { orderRepository } from './order.repository';
import { inventoryRepository } from '../inventories/inventory.repository';
import { OrderNotFoundError, OrderSignatureIsEmpty } from './order.error';
import { InventoryNotFoundError } from '../inventories/inventory.error';

// 1. Mock Repository ด้วยโมดูล vi ของ Vitest
vi.mock('./order.repository', () => ({
    orderRepository: {
        findAll: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../inventories/inventory.repository', () => ({
    inventoryRepository: {
        findById: vi.fn(),
    },
}));

// 2. Factory Function สำหรับเสก Mock Data ให้ตรงกับ Type จริง
function createMockOrder(overrides = {}) {
    const now = new Date();

    return {
        id: 1,
        signature: 'John Doe Signature',
        // 💡 ปรับปรุงไอเทมด้านล่างให้มีโครงสร้างตรงตามไทป์เป๊ะๆ
        items: [
            {
                inventory_id: 'INV-101',
                quantity: 2,
                order_quantity: 2,
                delivery_when: 'IMMEDIATE'
            }
        ],
        created_by: 'admin-1',
        created_date: now,
        ...overrides,
    };
}

describe('orderService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('listOrders', () => {
        it('returns paginated order list with correct totalPages calculation', async () => {
            const mockOrders = [createMockOrder(), createMockOrder({ id: 2 })];

            vi.mocked(orderRepository.findAll).mockResolvedValue({
                data: mockOrders as any,
                total: 25,
            });

            const result = await orderService.listOrders(1, 10);

            expect(orderRepository.findAll).toHaveBeenCalledWith(1, 10, undefined);
            expect(result.data).toHaveLength(2);
            expect(result.total).toBe(25);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
            expect(result.totalPages).toBe(3);
        });
    });

    describe('createOrder', () => {
        it('creates and returns a new order successfully', async () => {
            // 💡 อัปเดต Payload ให้มีสเปกตรงตามระเบียบของระบบ
            const payload = {
                signature: 'John Doe Signature',
                items: [
                    {
                        inventory_id: 'INV-101',
                        quantity: 2,
                        order_quantity: 2,
                        delivery_when: 'IMMEDIATE'
                    }
                ],
                createdBy: 'admin-1',
            };

            const expectedCreatedOrder = createMockOrder({ ...payload });

            vi.mocked(inventoryRepository.findById).mockResolvedValue({ id: 'INV-101' } as any);
            vi.mocked(orderRepository.create).mockResolvedValue(expectedCreatedOrder as any);

            const result = await orderService.createOrder(payload);

            expect(inventoryRepository.findById).toHaveBeenCalledWith('INV-101');
            expect(orderRepository.create).toHaveBeenCalledWith(payload);
            expect(result.id).toBe(1);
            expect(result.signature).toBe('John Doe Signature');
        });

        it('throws OrderSignatureIsEmpty when signature is empty or spaces', async () => {
            const payload = {
                signature: '   ',
                items: [
                    {
                        inventory_id: 'INV-101',
                        quantity: 2,
                        order_quantity: 2,
                        delivery_when: 'IMMEDIATE'
                    }
                ],
                createdBy: 'admin-1',
            };

            await expect(orderService.createOrder(payload)).rejects.toThrow(
                OrderSignatureIsEmpty
            );
            expect(orderRepository.create).not.toHaveBeenCalled();
        });

        it('throws InventoryNotFoundError when an item is not found in inventory', async () => {
            const payload = {
                signature: 'John Doe Signature',
                items: [
                    {
                        inventory_id: 'INV-999',
                        quantity: 5,
                        order_quantity: 5,
                        delivery_when: 'IMMEDIATE'
                    }
                ],
                createdBy: 'admin-1',
            };

            vi.mocked(inventoryRepository.findById).mockResolvedValue(null);

            await expect(orderService.createOrder(payload)).rejects.toThrow(
                InventoryNotFoundError
            );
            expect(inventoryRepository.findById).toHaveBeenCalledWith('INV-999');
            expect(orderRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('deleteOrder', () => {
        it('deletes the target order successfully', async () => {
            vi.mocked(orderRepository.delete).mockResolvedValue(true);

            await orderService.deleteOrder(1);

            expect(orderRepository.delete).toHaveBeenCalledWith(1);
        });

        it('throws OrderNotFoundError when target does not exist', async () => {
            vi.mocked(orderRepository.delete).mockResolvedValue(false);

            await expect(orderService.deleteOrder(999)).rejects.toThrow(
                OrderNotFoundError
            );
            expect(orderRepository.delete).toHaveBeenCalledWith(999);
        });
    });
});