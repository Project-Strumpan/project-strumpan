const productsArray = [
    {
        id: "1",
        title: "Strumpa1",
        description: "strumpa1 är en produkt",
        price: 20
    },
]

function getProductData(id: string) {
    let productData = productsArray.find(product => product.id === id);

    if (productData == undefined){
        console.log("Product data does not exist for ID: " + id);
        return undefined;
    }
    return productData;
}

export { productsArray, getProductData };