import { productsArray } from '@/productsStore';
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
    stock: number;
};
export default async function ProductDetails({params, }: {
    params: Promise<{ slug: string }>;
}) {
    const product = productsArray[0];
    const { slug } = await params

    return (
        <div>
            <div>
                {/* Stäng av prefetch senare */}
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
}