export async function GET() {

    // TODO: This is a test response
    const products = [
        {
            product_id: 1,
            category_id: 1,
            name: "Everyday Socks",
            description: "Everyday socks, for everyday needs",
            price: 12900,
            image_url: "",
            created_at: new Date(Date.now()) // TODO check if this is needed
        },
        {
            product_id: 2,
            category_id: 2,
            name: "Not Everyday Socks",
            description: "Not Everyday socks, for not everyday needs",
            price: 69690,
            image_url: "",
            created_at: new Date(Date.now()) // TODO check if this is needed
        }
    ];
    return Response.json(products);
}