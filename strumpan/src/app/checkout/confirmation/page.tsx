"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { OrderSummary } from "@/components/checkout/OrderSummary";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent");
  const redirectStatus = searchParams.get("redirect_status");

  const { items, pricing, clearCart } = useCart();
  const [orderItemsSnapshot] = useState(items);
  const [orderPricingSnapshot] = useState(pricing);
  const [createdOrder, setCreatedOrder] = useState<{
    order_id: number;
    order_status: string;
  } | null>(null);

  // Använd en ref för att säkerställa att anropet körs exakt EN gång och aldrig loopar
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    // Om betalningen lyckades och vi inte redan har skickat in för detta PaymentIntent
    if (redirectStatus === "succeeded" && paymentIntentId && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;

      // Töm varukorgen en gång
      clearCart();

      // Kontrollera även sessionStorage så att inte hot-reloads triggar om anropet
      const sessionKey = `order_recorded_${paymentIntentId}`;
      if (typeof window !== "undefined" && sessionStorage.getItem(sessionKey)) {
        try {
          const cached = JSON.parse(sessionStorage.getItem(sessionKey)!);
          setCreatedOrder(cached);
          return;
        } catch {}
      }

      let customerData = {
        name: "Klarna Kund",
        email: `klarna-${paymentIntentId.slice(-6)}@example.com`,
        phone: "+46700000000",
      };
      let addressData = {
        street: "Strumpgatan 12",
        postalCode: "111 22",
        city: "Stockholm",
        country: "Sverige",
      };

      try {
        const savedCustomer = sessionStorage.getItem("strumpan_checkout_customer");
        if (savedCustomer) {
          const parsed = JSON.parse(savedCustomer);
          if (parsed.name) customerData.name = parsed.name;
          if (parsed.email) customerData.email = parsed.email;
          if (parsed.phone) customerData.phone = parsed.phone;
          if (parsed.street) addressData.street = parsed.street;
          if (parsed.postalCode) addressData.postalCode = parsed.postalCode;
          if (parsed.city) addressData.city = parsed.city;
        }
      } catch {}

      fetch("/api/orders/from-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: paymentIntentId,
          paymentMethod: "klarna",
          paymentStatus: "paid",
          customer: customerData,
          address: addressData,
          items:
            orderItemsSnapshot.length > 0
              ? orderItemsSnapshot.map((item) => ({
                  variantId: Number(item.id) || 1,
                  quantity: item.quantity,
                  unitPrice: item.price,
                }))
              : [{ variantId: 1, quantity: 1, unitPrice: 89 }],
          totalCost: orderPricingSnapshot.totalGross || 89,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.order) {
            const orderInfo = {
              order_id: data.order.order_id,
              order_status: data.order.order_status,
            };
            setCreatedOrder(orderInfo);
            try {
              sessionStorage.setItem(sessionKey, JSON.stringify(orderInfo));
            } catch {}
          }
        })
        .catch((err) => {
          console.error("Kunde inte spara order i MariaDB:", err);
        });
    }
  }, [redirectStatus, paymentIntentId]);

  const isSuccess = redirectStatus === "succeeded";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {isSuccess ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Tack för din beställning!
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Din betalning har behandlats och godkänts via Stripe Sandbox.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {paymentIntentId && (
                <div className="inline-block rounded-lg bg-gray-50 px-4 py-2 text-xs text-gray-600 border border-gray-200">
                  <span className="font-medium text-gray-800">Referens-ID:</span>{" "}
                  <code className="font-mono text-gray-900">{paymentIntentId}</code>
                </div>
              )}
              {createdOrder && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-xs text-emerald-800 border border-emerald-200">
                  <span className="font-semibold">Ordernummer:</span>
                  <span className="font-mono font-bold">#{createdOrder.order_id}</span>
                  <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
                    Sparad i MariaDB
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Orderbekräftelse
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Beställningsstatus: {redirectStatus || "Slutförd"}
            </p>
          </>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/"
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Tillbaka till startsidan
          </Link>
          <Link
            href="/checkout"
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Gå till kassan igen
          </Link>
        </div>
      </div>

      {orderItemsSnapshot.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Kvitto & specifikation
          </h2>
          <OrderSummary
            items={orderItemsSnapshot}
            pricing={orderPricingSnapshot}
            isEditable={false}
          />
        </div>
      )}
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md text-center py-12 text-sm text-gray-500">
            Laddar orderbekräftelse...
          </div>
        }
      >
        <ConfirmationContent />
      </Suspense>
    </main>
  );
}

