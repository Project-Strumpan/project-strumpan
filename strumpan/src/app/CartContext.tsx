import { createContext, useState, ReactNode } from "react";
import { getProductData, productsArray } from "../productsStore"

type CartItem = {
        id: string;
        quantity: number;
    };

type CartContextType = {
  items: CartItem[];
  getProductQuantity: (id: string) => number;
  addOneToCart: (id: string) => void;
  removeOneFromCart: (id: string) => void;
  deleteFromCart: (id: string) => void;
  getTotalCost: () => number;
};

export const CartContext = createContext<CartContextType | undefined>(undefined);


export function CartProvider({children}: {children: ReactNode}) {
    
    const [cartProducts, setCartProducts] = useState<CartItem[]>([])

    function getProductQuantity(id: string) {
        const quantity = cartProducts.find(product => product.id === id)?.quantity

        if (quantity === undefined){
            return 0;
        }

        return quantity
    }

    function addOneToCart(id: string){
        const quantity = getProductQuantity(id);
        if (quantity === 0){
            setCartProducts([
                ...cartProducts, 
                {
                    id: id,
                    quantity: 1
                }
            ])
        }
        else {
            setCartProducts(
                cartProducts.map(
                    product =>
                        product.id === id
                    ? { ...product, quantity: product.quantity + 1 } // true
                    : product                                        // false
                )
            )
        }
    }

    function removeOneFromCart(id: string) {
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

    function deleteFromCart(id: string) {
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
        removeOneFromCart,
        deleteFromCart,
        getTotalCost
    }
    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    )
}

// Context (cart, addToCart, removeCart)
// Provider -> gives the React app access too all the things in your context