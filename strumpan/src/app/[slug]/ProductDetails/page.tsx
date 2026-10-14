import { productsArray } from '../../../productsStore';
import { Button, Form, Row, Col } from 'react-bootstrap';
import AddToCart from './AddToCart';
import Link from 'next/link';
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
        <div>
            <div>
                // Stäng av prefetch!!
                <Link href="/">return</Link>
                <h1>{productsArray[0].title}</h1>
                <p>{productsArray[0].description}</p>
                <AddToCart product={product}></AddToCart>
            </div>
            <div>
                <img></img>
            </div>
        </div>
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