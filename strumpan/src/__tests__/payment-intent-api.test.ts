import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/create-payment-intent/route";
import { pool } from "../lib/db";

describe("Stripe PaymentIntent API (/api/create-payment-intent)", () => {
  it("ska avvisa förfrågan med HTTP 400 om varukorgen är tom", async () => {
    const request = new Request("http://localhost:3000/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });

    const response = await POST(request);
    assert.equal(response.status, 400);

    const data = await response.json();
    assert.equal(data.error, "EMPTY_CART");
  });

  it("ska beräkna rätt belopp på servern och returnera pricing", async () => {
    const request = new Request("http://localhost:3000/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: "non-db-item", title: "Teststrumpa", price: 100, quantity: 2 }],
        countryCode: "SE",
        customerEmail: "kund@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Verifiera att pricing beräknades säkert på servern
    assert.ok(data.pricing);
    assert.equal(data.pricing.subtotalGross, 200);
    assert.equal(data.pricing.shippingGross, 39);
    assert.equal(data.pricing.totalGross, 239);
    assert.equal(data.pricing.totalGrossInOre, 23900);
    assert.equal(data.pricing.vatPercentageText, "25%");

    // Om Stripe testnyckel finns i miljön returneras clientSecret (börjar med pi_)
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("your_secret_key")) {
      assert.ok(data.clientSecret);
      assert.match(data.clientSecret, /^pi_/);
    }
  });

  it("ska stödja EU-länder och räkna om moms och totalsumma på servern", async () => {
    const request = new Request("http://localhost:3000/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: "non-db-de-item", title: "Tysk order", price: 200, quantity: 2 }], // 400 kr -> fri frakt
        countryCode: "DE",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    assert.ok(data.pricing);
    assert.equal(data.pricing.countryCode, "DE");
    assert.equal(data.pricing.vatPercentageText, "19%");
    assert.equal(data.pricing.subtotalGross, 400);
    assert.equal(data.pricing.totalGrossInOre, 40000);
  });

  it("ska förhindra prismanipulation (t.ex. price: 0.01) och hämta det auktoritativa priset från MariaDB", async () => {
    // Klienten försöker manipulera priset till 0.01 kr för Variant 1 (som kostar 89 kr i MariaDB)
    const request = new Request("http://localhost:3000/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: "1", title: "Classic Cotton Sock", price: 0.01, quantity: 2 }],
        countryCode: "SE",
        customerEmail: "hacker@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    assert.ok(data.pricing);
    // Om databasen är ansluten har priset 0.01 skrivits över med MariaDB:s riktiga 89.00 kr (2 * 89 = 178 kr)
    // 178 kr subtotal + 39 kr frakt = 217 kr (21700 öre), ALDRIG 0.02 kr!
    assert.equal(data.pricing.subtotalGross, 178);
    assert.equal(data.pricing.totalGross, 217);
    assert.equal(data.pricing.totalGrossInOre, 21700);
  });

  after(async () => {
    try {
      await pool.end();
    } catch {}
  });
});

