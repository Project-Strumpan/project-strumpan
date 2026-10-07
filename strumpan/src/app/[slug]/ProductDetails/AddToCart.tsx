"use client";

import {useState } from "react"

export default function AddToCart({ product }){
    const [quantity, setQuantity] = useState(1);

    function addToCart() {
        console.log("Adding", product.id, quantity);
    }

    return (
        <div>
            <button onClick={() => setQuantity(quantity - 1)}></button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}></button>
            <button onClick={addToCart}>
                Add to cart
            </button>
        </div>
    )
}