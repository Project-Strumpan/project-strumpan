"use client"

import { Button, Form, Row, Col } from 'react-bootstrap';
import { useContext } from "react"
import { CartContext } from "@/app/CartContext";

type Product = 
    {
    id: string;
    title: string;
    description: string;
    price: number;
};

export default function AddToCart({ product }: {product: Product}){
    const cart = useContext(CartContext);
    const productQuantity = cart?.getProductQuantity(product.id);
    console.log("Adding", product.id, productQuantity);
    if (typeof(cart) === undefined || typeof(productQuantity) === undefined) {
        console.error("product or cart doesnt exist" +
            "cart status " + cart +
            "product status " + productQuantity
        );
        return;
    }
    console.log(cart?.items);
    return (
        <div>
            <span>{productQuantity}</span>
            { 
                productQuantity! > 0 ? 
                <>
                    <Form as={Row}>
                        <Form.Label column sm="6">In Cart: {productQuantity}</Form.Label>
                        <Col sm={6} className="d-flex gap-2">
                            <Button
                            onClick={() => cart!.addOneToCart(product.id)}
                            aria-label="Increase quantity"
                            >+
                            </Button>

                            <Button
                            variant="secondary"
                            onClick={() => cart!.removeOneFromCart(product.id)}
                            aria-label="Decrease quantity"
                            >-
                            </Button>
                        </Col>
                    </Form>
                    <Button variant="danger" onClick={() => cart?.deleteFromCart(product.id)} className='my-2'></Button>
                </>
                :
                <Button onClick={() => cart?.addOneToCart(product.id)}>
                Add to cart
            </Button>
            }
        </div>
    )
}