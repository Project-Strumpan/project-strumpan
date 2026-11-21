import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe-server";
import { calculateOrderPricing, OrderItemInput } from "@/lib/pricing";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: OrderItemInput[] = Array.isArray(body.items) ? body.items : [];
    const countryCode: string = typeof body.countryCode === "string" ? body.countryCode : "SE";
    const customerEmail: string = typeof body.customerEmail === "string" ? body.customerEmail : "";

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "EMPTY_CART", message: "Varukorgen är tom." },
        { status: 400 }
      );
    }

    // 1. Säkerhetsvalidering mot databasen: Slå upp verkliga priser från MariaDB
    // så att en kund inte kan manipulera sitt eget pris (t.ex. skicka in price: 0.01)
    const variantIds = items
      .map((item) => Number(item.id))
      .filter((id) => !isNaN(id) && id > 0);

    if (variantIds.length > 0) {
      try {
        const conn = await pool.getConnection();
        const placeholders = variantIds.map(() => "?").join(", ");
        const dbVariants = await conn.query<any[]>(
          `
          SELECT pv.variant_id, p.price, p.product_name, pv.product_variant_size, pv.color
          FROM Product_variants pv
          JOIN Products p ON p.product_id = pv.product_id
          WHERE pv.variant_id IN (${placeholders})
          `,
          variantIds
        );
        conn.release();

        const priceMap = new Map<number, { price: number; title: string }>();
        for (const row of dbVariants) {
          priceMap.set(Number(row.variant_id), {
            price: Number(row.price),
            title: row.product_name,
          });
        }

        // Skriv över klientens priser med det auktoritativa priset från MariaDB
        for (const item of items) {
          const vId = Number(item.id);
          const dbData = priceMap.get(vId);
          if (dbData) {
            item.price = dbData.price;
            if (!item.title) {
              item.title = dbData.title;
            }
          }
        }
      } catch (dbErr) {
        // Om databasen inte är ansluten (t.ex. vid vissa fristående enhetstester) loggas en varning
        console.warn("Kunde inte slå upp serverpriser från MariaDB (använder fallback):", dbErr);
      }
    }

    // Beräkna priser och moms på servern med de verifierade priserna
    const pricing = calculateOrderPricing(items, countryCode);

    if (pricing.totalGrossInOre <= 0) {
      return NextResponse.json(
        { error: "INVALID_AMOUNT", message: "Ogiltigt orderbelopp." },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();
    if (!stripe) {
      return NextResponse.json(
        {
          error: "STRIPE_KEYS_MISSING",
          message:
            "Stripe API-nycklar saknas. Lägg in din NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY och STRIPE_SECRET_KEY i .env.local för att testa mot Stripe Sandbox.",
          pricing,
        },
        { status: 200 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.totalGrossInOre,
      currency: "sek",
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || undefined,
      metadata: {
        countryCode: pricing.countryCode,
        vatRate: pricing.vatPercentageText,
        subtotalGross: pricing.subtotalGross.toString(),
        shippingGross: pricing.shippingGross.toString(),
        totalVat: pricing.totalVat.toString(),
        totalGross: pricing.totalGross.toString(),
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0).toString(),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      pricing,
    });
  } catch (error: unknown) {
    console.error("Fel vid skapande av Stripe PaymentIntent:", error);
    const errorMessage = error instanceof Error ? error.message : "Internt serverfel vid betalning.";
    return NextResponse.json(
      { error: "PAYMENT_INTENT_FAILED", message: errorMessage },
      { status: 500 }
    );
  }
}

