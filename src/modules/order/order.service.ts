import { orderRepository } from './order.repository';
import { inventoryRepository } from '../inventories/inventory.repository';
import type { CreateOrderPayload } from './dto/input-order';
import { OrderNotFoundError, OrderSignatureIsEmpty } from './order.error';
import { InventoryNotFoundError } from '../inventories/inventory.error';
import { OrderResponseSchema, OrderResponse } from './dto/response/list-order-response.dto'

export const orderService = {
  async listOrders(page: number, limit: number, filters?: { orderDate?: string; approvedBy?: string; signature?: string }) {
    const { data, total } = await orderRepository.findAll(page, limit, filters);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async createOrder(data: CreateOrderPayload & { createdBy: string }): Promise<OrderResponse> {
    if (!data.signature?.trim()) {
      throw new OrderSignatureIsEmpty;
    }

    for (const item of data.items) {
      const inv = await inventoryRepository.findById(item.inventory_id);
      if (!inv) throw new InventoryNotFoundError();
    }

    return await orderRepository.create(data);
  },

  async approveOrderSupplier(orderId: number, supplierId: string, approvedBy: string): Promise<void> {
    if (!supplierId) {
      throw new Error('Supplier ID is required for approval');
    }

    const isUpdated = await orderRepository.approveBySupplier(orderId, supplierId, approvedBy);

    if (!isUpdated) {
      throw new Error('ไม่พบรายการคำสั่งซื้อของซัพพลายเออร์รายนี้ในระบบ หรืออาจถูกอนุมัติไปแล้ว');
    }
  },

  async deleteOrder(id: number): Promise<void> {
    const deleted = await orderRepository.delete(id);
    if (!deleted) throw new OrderNotFoundError();
  }
};