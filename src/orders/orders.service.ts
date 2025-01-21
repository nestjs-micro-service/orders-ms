import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { NATS_SERVICE } from '../config/services';
import { firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products';
import { PaidOrderDto } from './dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      //Check if the products exists on the Products database
      const productIds = createOrderDto.items.map((item) => item.productId);
      const products: any[] = await firstValueFrom(
        this.client.send({ cmd: 'validateProducts' }, productIds),
      );

      //Calculate total amount and price
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(
          (product) => product.id === orderItem.productId,
        ).price;
        return price * orderItem.quantity + acc;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      //Create a database transaction
      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(
                  (product) => product.id === orderItem.productId,
                ).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId)
            .name,
        })),
      };
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Check logs',
      });
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalPages = await this.order.count({
      where: { status: orderPaginationDto.status },
    });

    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;

    const orders = await this.order.findMany({
      skip: (currentPage - 1) * perPage,
      take: perPage,
      where: { status: orderPaginationDto.status },
    });

    return {
      data: orders,
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order ${id} not found`,
      });
    }

    //Check if the products exists on the Products database
    const productIds = order.OrderItem.map((orderItem) => orderItem.productId);
    const products: any[] = await firstValueFrom(
      this.client.send({ cmd: 'validateProducts' }, productIds),
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: products.find((product) => product.id === orderItem.productId)
          .name,
      })),
    };
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    await this.findOne(id);

    return this.order.update({
      where: { id },
      data: { status },
    });
  }

  async createPaymentSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItem.map((orderItem) => {
          return {
            name: orderItem.name,
            price: orderItem.price,
            quantity: orderItem.quantity,
          };
        }),
      }),
    );
    return paymentSession;
  }

  async markOrderAsPaid(paidOrderDto: PaidOrderDto) {
    const orderUpdated = await this.order.update({
      where: { id: paidOrderDto.orderId },
      data: {
        stripeChargeId: paidOrderDto.stripePaymentId,
        status: 'PAID',
        paid: true,
        paidAt: new Date(),

        //We leverage the fact that Orders has 1-1 relation with OrderReceipt table, so it allow us to ensure ACID database transactions and avoid using this.$transactions separatelly in this case
        OrderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receiptUrl,
          },
        },
      },
    });

    return orderUpdated;
  }
}
