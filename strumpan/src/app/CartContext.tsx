"use client"

import { createContext, useState, ReactNode } from "react";
import { getProductData } from "../productsStore"

export type Product = {
    id: number,
    quantity: number,
    category_id: number,
    product_name: string,
    product_description: string,
    price: number,
    stock: number,
    picture_url: string,
    origin: string,
    material: string,
    env_labels: string,
    created_date: Date,
};

type CartContextType = {
  items: Product[];
  getProductQuantity: (id: number) => number;
  addOneToCart: (id: number) => void;
  removeOneFromCart: (id: number) => void;
  deleteFromCart: (id: number) => void;
  getTotalCost: () => number;
};

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({children}: {children: ReactNode}) {
    
    const [cartProducts, setCartProducts] = useState<Product[]>([])

    function getProductQuantity(id: number) {
        const quantity = cartProducts.find(product => product.id === id)?.quantity

        if (quantity === undefined){
            return 0;
        }

        return quantity
    }

    function addOneToCart(id: number) {
        const productData = getProductData(id);
        if (!productData) return;

        const quantity = getProductQuantity(id);
        if (quantity >= productData.stock) return;

        setCartProducts(prevCart => {
            const existingProduct = prevCart.find(product => product.id === id);

            if (!existingProduct) {
                return [
                    ...prevCart,
                    {
                        ...productData,
                        quantity: 1
                    }
                ];
            }

            return prevCart.map(product =>
                product.id === id
                    ? { ...product, quantity: product.quantity + 1 } // true
                    : product                                        // false
            );
        });
    }

    function removeOneFromCart(id: number) {
        const quantity = getProductQuantity(id);

        if (quantity == 1){
            deleteFromCart(id);
        }
        else{
            setCartProducts(
                cartProducts.map(
                    product =>
                        product.id === id
                    ? { ...product, quantity: product.quantity - 1 } // true
                    : product                                        // false
                )
            )
        }
    }
    function getTotalCost() {
        let totalCost = 0;
        cartProducts.map((cartItem) => {
            const productData = getProductData(cartItem.id);
            if (productData != undefined){
                totalCost += (productData.price * cartItem.quantity);
            }
        });
        return totalCost;
    }

    function deleteFromCart(id: number) {
        setCartProducts(
            cartProducts =>
            cartProducts.filter(product => {
                return product.id != id;
                }
            )
        )
    }

    const contextValue: CartContextType = {
        items: cartProducts,
        getProductQuantity,
        addOneToCart,
        removeOneFromCart: removeOneFromCart,
        deleteFromCart,
        getTotalCost
    }
    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    )
}

export default CartProvider;

// Context (cart, addToCart, removeCart)
// Provider -> gives the React app access too all the things in your context