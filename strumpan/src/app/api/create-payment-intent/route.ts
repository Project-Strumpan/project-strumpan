import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe-server";
import { calculateOrderPricing, OrderItemInput } from "@/lib/pricing";

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

    // Beräkna priser och moms på servern för säkerhet
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

