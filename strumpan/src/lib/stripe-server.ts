import Stripe from "stripe";

let stripeServerInstance: Stripe | null = null;

export function getStripeServer(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === "sk_test_your_secret_key_here" || secretKey === "sk_test_") {
    return null;
  }

  if (!stripeServerInstance) {
    stripeServerInstance = new Stripe(secretKey);
  }

  return stripeServerInstance;
}

