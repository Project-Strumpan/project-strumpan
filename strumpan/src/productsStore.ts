//Temporary product storage before database integration 

const productsArray = [
    {
    id: 1,
    quantity: 0,
    category_id: 1,
    name: "Minimalist Chair",
    description: "Oak / Natural",
    price: 249,
    stock: 50,
    picture_url:
      "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=300&q=80",
    origin: "Lorem Ipsum",
    material: "Lorem Ipsum",
    env_labels: "Lorem Ipsum",
    created_date: new Date("2025/4/4"),
  },
  {
    id: 2,
    quantity: 0,
    category_id: 2,
    name: "Ceramic Table Lamp",
    description: "White / Medium",
    price: 89,
    stock: 100,
    picture_url:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=300&q=80",

  },
]

function getProductData(id: number) {
    let productData = productsArray.find(product => product.id === id);

    if (productData == undefined){
        console.log("Product data does not exist for ID: " + id);
        return undefined;
    }
    return productData;
}

export { productsArray, getProductData }; 