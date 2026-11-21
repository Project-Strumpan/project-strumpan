import Stripe from "stripe";

let stripeServerInstance: Stripe | null = null;

export function setStripeServerInstance(instance: Stripe | null) {
  stripeServerInstance = instance;
}

export function getStripeServer(): Stripe | null {
  if (stripeServerInstance) {
    return stripeServerInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === "sk_test_your_secret_key_here" || secretKey === "sk_test_") {
    return null;
  }

  stripeServerInstance = new Stripe(secretKey);
  return stripeServerInstance;
}

export interface StripePaymentVerification {
  verified: boolean;
  status: string;
  paymentMethod: "klarna" | "stripe";
  amountInOre: number;
  currency: string;
}

/**
 * Frågar Stripe direkt via serverns hemliga API-nyckel om en betalning
 * verkligen är mottagen och godkänd ('succeeded').
 */
export async function verifyStripePayment(
  transactionId: string
): Promise<StripePaymentVerification> {
  const stripe = getStripeServer();
  if (!stripe) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);

  // Kontrollera om betalmetoden var Klarna
  const isKlarna =
    paymentIntent.payment_method_types?.includes("klarna") ||
    paymentIntent.metadata?.paymentMethod === "klarna";

  return {
    verified: paymentIntent.status === "succeeded",
    status: paymentIntent.status,
    paymentMethod: isKlarna ? "klarna" : "stripe",
    amountInOre: paymentIntent.amount,
    currency: paymentIntent.currency,
  };
}

