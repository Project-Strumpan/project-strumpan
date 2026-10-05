export type Order = {
    order_id: number;
    customer_id: number;
    shipping_address_id: number;
    billing_address_id: number;
    order_date: Date;
    status: string;
    total_price: number;
}

export type CreateOrderItemRequest = {
    variant_id: number;
    quantity: number;
};

export type CreateOrderRequest = {
    delivery_address_id: number;
    invoice_address_id: number;
    items: CreateOrderItemRequest[];
};

export type CreateOrderResponse = {
    order_id: number;
    order_status: "created";
    total_cost: number;
    items: {
        order_item_id: number;
        variant_id: number;
        quantity: number;
        unit_price: number;
    }[];
};
