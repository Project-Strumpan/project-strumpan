export type OrderItem = {
    order_item_id: number;
    variant_id: number;
    product_id: number;
    product_name: string;
    product_variant_size: string;
    color: string | null;
    sku: string;
    quantity: number;
    unit_price: number | string;
}

export type Order = {
    order_id: number;
    order_status: 
        | "created"
        | "paid"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned";
    order_date: Date | string;
    total_cost: number | string;
    delivery_address: string;
    invoice_address: string;
    items: OrderItem[];
    shipments: object;
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
