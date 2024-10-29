import { OrderStatus } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class ChangeOrderStatusDto {
  @IsUUID(4)
  id: string;

  @IsEnum(OrderStatus, {
    message: `Status must be a valid value: ${OrderStatus}`,
  })
  status: OrderStatus;
}
