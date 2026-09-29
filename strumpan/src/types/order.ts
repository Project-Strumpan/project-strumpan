export type Order = {
    order_id: number;
    customer_id: number;
    shipping_address_id: number;
    billing_address_id: number;
    order_date: Date;
    status: string;
    total_price: number;
}