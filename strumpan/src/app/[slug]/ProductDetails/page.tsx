import { productsArray } from '../../../productsStore';
import { Button, Form, Row, Col } from 'react-bootstrap';
import { useContext } from "react"
import CartProvider, { CartContext } from "@/app/CartContext";
import AddToCart from './AddToCart';
//import { db } from '@/lib/db';

// const product = await db.product.findUnique({
    //     where: { slug },
    // });
type Product = 
    {
    id: string;
    title: string;
    description: string;
    price: number;
};
export default async function ProductDetails({params, }: {
    params: Promise<{ slug: string }>;
}) {
    const product = productsArray[0];
    const { slug } = await params

    return (
        <CartProvider>
            <div>
                <div>
                    <h1>{productsArray[0].title}</h1>
                    <p>{productsArray[0].description}</p>
                    <AddToCart product={product}></AddToCart>
                </div>
                <div>
                    <img></img>
                </div>
            </div>
        </CartProvider>
    )
    // return (
    //     <>
    //     {productsArray.map((product, idx) => (
    //         <div key={idx}>
    //             <h1>{product.title}</h1>
    //             <p>{product.description}</p>
    //             <p>{product.price}</p>
    //             <img src="https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=700&q=80" alt={product.title}></img>

    //             <Button variant="primary">Add To Cart</Button>
    //         </div>
    //     ))}
            
    //     </>
    // )
}