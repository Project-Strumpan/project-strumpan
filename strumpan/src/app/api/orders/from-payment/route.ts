import { NextRequest, NextResponse } from "next/server";
import { createPaidOrder, OrderCreationError } from "@/lib/order-service";
import { verifyStripePayment, getStripeServer } from "@/lib/stripe-server";
import type { CreatePaidOrderInput } from "@/types/order";

export async function POST(request: NextRequest) {
  let body: CreatePaidOrderInput;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Request body måste vara giltig JSON." },
      { status: 400 }
    );
  }

  // 1. Grundläggande statuskontroll från anroparen
  const isPaid =
    body.paymentStatus === "paid" ||
    body.paymentStatus === "succeeded" ||
    body.paymentStatus === "authorized";

  if (!isPaid) {
    return NextResponse.json(
      {
        error: "PAYMENT_NOT_COMPLETED",
        message:
          "Order skapas inte eftersom betalningen inte är godkänd. Inga obetalda ordrar sparas.",
      },
      { status: 400 }
    );
  }

  // 2. Stripe Server-Side Verifiering: Fråga Stripe direkt med hemlig API-nyckel
  // om transaktions-ID är ett Stripe PaymentIntent (börjar med pi_)
  const isStripeIntent = body.transactionId?.startsWith("pi_");
  const stripeServer = getStripeServer();

  if (isStripeIntent && stripeServer) {
    try {
      const verification = await verifyStripePayment(body.transactionId);

      if (!verification.verified) {
        return NextResponse.json(
          {
            error: "STRIPE_PAYMENT_NOT_SUCCEEDED",
            message: `Betalningen kunde inte verifieras hos Stripe (status hos Stripe: '${verification.status}'). Inga obetalda ordrar sparas.`,
          },
          { status: 400 }
        );
      }

      // Uppdatera metod baserat på vad Stripe bekräftar (t.ex. Klarna)
      if (verification.paymentMethod === "klarna") {
        body.paymentMethod = "klarna";
      }
    } catch (stripeErr: unknown) {
      const errMessage =
        stripeErr instanceof Error ? stripeErr.message : "Okänt Stripe-fel";
      return NextResponse.json(
        {
          error: "STRIPE_VERIFICATION_FAILED",
          message: `Transaktionen kunde inte verifieras mot Stripe: ${errMessage}`,
        },
        { status: 400 }
      );
    }
  }

  try {
    const orderResult = await createPaidOrder(body);

    const status = orderResult.alreadyExists ? 200 : 201;
    return NextResponse.json(
      {
        success: true,
        message: orderResult.alreadyExists
          ? "Ordern var redan registrerad."
          : "Order och betalning har registrerats i databasen.",
        order: orderResult,
      },
      { status }
    );
  } catch (error: unknown) {
    if (error instanceof OrderCreationError) {
      return NextResponse.json(
        { error: "ORDER_CREATION_FAILED", message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("Serverfel vid skapande av order efter betalning:", error);
    const message = error instanceof Error ? error.message : "Internt databasfel.";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 }
    );
  }
}
