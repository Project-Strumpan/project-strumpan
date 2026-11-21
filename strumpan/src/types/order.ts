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

export type PaymentMethod = "klarna" | "stripe" | "swish";
export type PaymentStatus = "pending" | "authorized" | "paid" | "failed" | "refunded";

export interface PaidOrderCustomerInput {
    name: string;
    email: string;
    phone?: string;
}

export interface PaidOrderAddressInput {
    street: string;
    postalCode: string;
    city: string;
    country: string;
}

export interface PaidOrderItemInput {
    variantId: number;
    quantity: number;
    unitPrice: number;
}

export interface CreatePaidOrderInput {
    transactionId: string;
    paymentMethod: PaymentMethod;
    paymentStatus: string;
    customer: PaidOrderCustomerInput;
    address: PaidOrderAddressInput;
    items: PaidOrderItemInput[];
    totalCost: number;
}

export interface CreatePaidOrderResult {
    order_id: number;
    customer_id: number;
    order_status: "paid";
    total_cost: number;
    order_date: string;
    payment: {
        payment_id: number;
        payment_method: PaymentMethod;
        payment_status: "paid";
        transaction_id: string;
        total_amount: number;
        payment_date: string;
    };
    items: {
        order_item_id: number;
        variant_id: number;
        quantity: number;
        unit_price: number;
    }[];
    alreadyExists?: boolean;
}
