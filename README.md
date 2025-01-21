## Order Microservice

## Description
The Order microservice (order-ms) is a microservice designed to handle the creation, management, and processing of customer orders. It handle several operations such as placing new orders, updating existing orders, retrieving order details, and managing order statuses. This service is a crucial component of an e-commerce platform, ensuring that orders are processed efficiently and accurately. 

This microservice communicates with other services via NATS messaging, and uses Prisma as the ORM to interact with the PostgresSQL database.

## Features
- **Order Creation**: Allows customers to place new orders with various items.
- **Order Retrieval**: Provides endpoints to fetch order details by order ID.
- **Order Update**: Enables updating order information, such as changing quantities or items.
- **Order Status Management**: Manages the lifecycle of an order, including statuses like pending, confirmed, shipped, and delivered.
- **Integration**: Integrates with other microservices such as payments and products for a seamless order processing workflow.

## Architecture

![Image](https://github.com/user-attachments/assets/04a65ee4-d813-4c3c-9136-6914679a1aaf)

## Usage
To use this microservice repository, follow the setup instructions provided in the README file of the Products-launcher repository.

[Products-launcher repository](https://github.com/nahuel-98/products-launcher) 
