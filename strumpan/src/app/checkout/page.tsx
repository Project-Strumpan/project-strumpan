"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { useCart } from "@/context/CartContext";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { StripePaymentForm } from "@/components/checkout/StripePaymentForm";
import { SUPPORTED_COUNTRIES } from "@/lib/pricing";
import { useIsMounted } from "@/lib/use-mounted";

export default function CheckoutPage() {
  const isMounted = useIsMounted();
  const {
    items,
    pricing,
    selectedCountry,
    setSelectedCountry,
    updateQuantity,
    removeItem,
  } = useCart();

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    street: "",
    postalCode: "",
    city: "",
    phone: "",
  });

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isLoadingPaymentIntent, setIsLoadingPaymentIntent] = useState(false);
  const [, startTransition] = useTransition();

  const stripePromise = getStripe();

  // Skapa eller uppdatera PaymentIntent när varukorgen eller landet ändras
  useEffect(() => {
    let isCurrent = true;

    async function initPaymentIntent() {
      if (items.length === 0) {
        if (isCurrent) {
          setClientSecret(null);
        }
        return;
      }

      setIsLoadingPaymentIntent(true);
      setStripeError(null);

      try {
        const res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            countryCode: selectedCountry,
            customerEmail: customerInfo.email,
          }),
        });

        const data = await res.json();

        if (!isCurrent) return;

        if (data.error === "STRIPE_KEYS_MISSING") {
          setStripeError(data.message);
          setClientSecret(null);
        } else if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setStripeError(null);
        } else {
          setStripeError(data.message || "Kunde inte initiera betalning.");
          setClientSecret(null);
        }
      } catch (err: unknown) {
        if (!isCurrent) return;
        const msg = err instanceof Error ? err.message : "Nätverksfel";
        setStripeError(`Kunde inte ansluta till betalningstjänsten: ${msg}`);
      } finally {
        if (isCurrent) setIsLoadingPaymentIntent(false);
      }
    }

    initPaymentIntent();

    return () => {
      isCurrent = false;
    };
  }, [items, selectedCountry, customerInfo.email]);

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newCountry = e.target.value;
    startTransition(() => {
      setSelectedCountry(newCountry);
    });
  }

  if (!isMounted) {
    return (
      <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="py-20 text-center text-sm text-gray-500">
            Laddar kassan...
          </div>
        </div>
      </main>
    );
  }

  // Tom varukorg
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Din varukorg är tom</h1>
          <p className="mt-2 text-sm text-gray-500">
            Lägg till produkter i varukorgen för att slutföra ditt köp.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/cart"
              className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Till varukorgen
            </Link>
            <Link
              href="/"
              className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition"
            >
              Till butiken
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Navigation & Header */}
        <div className="mb-6 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="hover:text-gray-900">
              Hem
            </Link>
            <span>/</span>
            <Link href="/cart" className="hover:text-gray-900">
              Varukorg
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Kassa</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Kassa & Betalning
          </h1>
        </div>

        {/* Grid: Uppgifter & Betalning (Vänster) vs Ordersammanfattning (Höger) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Vänster kolumn: Kunduppgifter, leverans & Stripe */}
          <div className="space-y-6 lg:col-span-7">
            {/* 1. Kund- & Leveransuppgifter */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                1. Leveransadress
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Fullständigt namn
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="För- och efternamn"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    E-postadress
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="namn@exempel.se"
                    value={customerInfo.email}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, email: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Telefonnummer
                  </label>
                  <input
                    type="tel"
                    placeholder="070-123 45 67"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, phone: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Gatuadress
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Gata och gatunummer"
                    value={customerInfo.street}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, street: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Postnummer
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="123 45"
                    value={customerInfo.postalCode}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        postalCode: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Ort
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Stad / Ort"
                    value={customerInfo.city}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, city: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                {/* Landväljare - Förberedd för EU-moms */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-700">
                      Land
                    </label>
                    <span className="text-[11px] text-gray-500">
                      Momssats beräknas efter leveransland
                    </span>
                  </div>
                  <select
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    {Object.values(SUPPORTED_COUNTRIES).map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({Math.round(country.vatRate * 100)}% moms)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* 2. Stripe Betalning */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    2. Betalningsmetod
                  </h2>
                  <p className="text-xs text-gray-500">
                    Kortbetalning, Apple Pay eller Google Pay via Stripe
                  </p>
                </div>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  Säker kassa
                </span>
              </div>

              {isLoadingPaymentIntent && (
                <div className="flex items-center justify-center py-8 text-sm text-gray-500 gap-2">
                  <svg
                    className="h-5 w-5 animate-spin text-gray-600"
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
                  Laddar betalningsmodul...
                </div>
              )}

              {stripeError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-amber-800">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Stripe-konfiguration</span>
                  </div>
                  <p>{stripeError}</p>
                </div>
              )}

              {clientSecret && stripePromise && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#111827",
                        borderRadius: "8px",
                      },
                    },
                  }}
                >
                  <StripePaymentForm
                    totalGross={pricing.totalGross}
                    disabled={items.length === 0}
                  />
                </Elements>
              )}
            </section>
          </div>

          {/* Höger kolumn: Ordersammanfattning */}
          <div className="lg:col-span-5">
            <div className="sticky top-6">
              <OrderSummary
                items={items}
                pricing={pricing}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                isEditable={false}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
