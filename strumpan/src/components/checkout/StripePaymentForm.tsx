"use client";

import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatSEK } from "@/lib/pricing";

interface StripePaymentFormProps {
  totalGross: number;
  onPaymentSuccess?: () => void;
  disabled?: boolean;
}

export function StripePaymentForm({ totalGross, disabled }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe har inte laddats ännu
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const returnUrl = `${origin}/checkout/confirmation`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    // Om vi når hit har ett direkt fel uppstått (t.ex. kort nekades, ogiltigt CVC)
    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setErrorMessage(error.message || "Ett fel uppstod vid betalningen.");
      } else {
        setErrorMessage("Ett oväntat fel inträffade. Vänligen försök igen.");
      }
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <PaymentElement
          id="payment-element"
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          <p className="font-medium">Betalningsfel</p>
          <p>{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing || disabled}
        className="w-full rounded-xl bg-gray-900 px-6 py-4 text-center text-base font-semibold text-white shadow-md transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Behandlar betalning...
          </span>
        ) : (
          `Betala ${formatSEK(totalGross)}`
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
        <span>Säker och krypterad betalning med Stripe</span>
      </div>
    </form>
  );
}

