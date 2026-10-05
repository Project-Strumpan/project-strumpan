import { productsArray } from '../../../productsStore';
import { Button } from '@/components/ui/button';
//import { db } from '@/lib/db';

// const product = await db.product.findUnique({
    //     where: { slug },
    // });

export default async function ProductDetails({params, }: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params
    
    return (
        <>
        {productsArray.map((product, idx) => (
            <div>
                <h1 key={idx}>{product.title}</h1>
                <p>{product.description}</p>
                <p>{product.price}</p>
                <img src="https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=700&q=80" alt={product.title}></img>

                <AddToCart product={product} />
            </div>
        ))}
            
        </>
    )
}
function AddToCart(prop: any){
    const product = prop.product;
    return(
        <Button variant="primary">Add To Cart</Button>
    )
}