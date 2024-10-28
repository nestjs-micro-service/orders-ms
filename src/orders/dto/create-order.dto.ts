import { IsNotEmpty, IsNumber } from 'class-validator';


export class CreateOrderDto {
  @IsNotEmpty()
  @IsNumber()
  readonly productId: number;
}
