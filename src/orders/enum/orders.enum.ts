import { OrderStatus } from '@prisma/client';
//To centralize all status Orders possible

export const OrderStatusList = [
  OrderStatus.CANCELLED,
  OrderStatus.DELIVERED,
  OrderStatus.PENDING,
];

