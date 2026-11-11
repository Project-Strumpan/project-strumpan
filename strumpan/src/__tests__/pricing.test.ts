import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateOrderPricing,
  getVatRateForCountry,
  DEFAULT_COUNTRY_CODE,
  formatSEK,
} from "../lib/pricing";

describe("Pricing & VAT Engine (Acceptanskriterier för moms & ordersammanfattning)", () => {
  it("ska stödja svensk standardmoms (25%) som förval", () => {
    const country = getVatRateForCountry();
    assert.equal(country.code, "SE");
    assert.equal(country.vatRate, 0.25);
    assert.equal(country.name, "Sverige");
  });

  it("ska vara förberedd för EU-moms och returnera rätt momssats per landskod", () => {
    const germany = getVatRateForCountry("DE");
    assert.equal(germany.code, "DE");
    assert.equal(germany.vatRate, 0.19);

    const finland = getVatRateForCountry("FI");
    assert.equal(finland.code, "FI");
    assert.equal(finland.vatRate, 0.255);

    const denmark = getVatRateForCountry("DK");
    assert.equal(denmark.code, "DK");
    assert.equal(denmark.vatRate, 0.25);

    // Fallback till Sverige om okänd landskod anges
    const unknown = getVatRateForCountry("XYZ");
    assert.equal(unknown.code, DEFAULT_COUNTRY_CODE);
    assert.equal(unknown.vatRate, 0.25);
  });

  it("ska beräkna korrekt svensk moms (25%) på varor och frakt", () => {
    const items = [
      { id: "1", title: "Klassisk Strumpa", price: 100, quantity: 2 }, // 200 kr
    ];

    // Under 399 kr -> tillkommer 39 kr standardfrakt
    // Totalt: 200 + 39 = 239 kr brutto
    const pricing = calculateOrderPricing(items, "SE");

    assert.equal(pricing.subtotalGross, 200);
    assert.equal(pricing.shippingGross, 39);
    assert.equal(pricing.totalGross, 239);
    assert.equal(pricing.vatPercentageText, "25%");

    // Moms på 200 kr vid 25% moms = 200 - (200 / 1.25) = 40 kr
    assert.equal(pricing.subtotalVat, 40);
    assert.equal(pricing.subtotalNet, 160);

    // Moms på 39 kr frakt = 39 - (39 / 1.25) = 7.8 kr
    assert.equal(pricing.shippingVat, 7.8);
    assert.equal(pricing.shippingNet, 31.2);

    // Total moms = 40 + 7.8 = 47.8 kr
    assert.equal(pricing.totalVat, 47.8);

    // Stripe format (belopp i öre)
    assert.equal(pricing.totalGrossInOre, 23900);
  });

  it("ska tillämpa fri frakt när ordervärdet är 399 kr eller högre", () => {
    const items = [
      { id: "1", title: "Premium Ullstrumpa", price: 200, quantity: 2 }, // 400 kr
    ];

    const pricing = calculateOrderPricing(items, "SE");

    assert.equal(pricing.subtotalGross, 400);
    assert.equal(pricing.shippingGross, 0);
    assert.equal(pricing.isFreeShipping, true);
    assert.equal(pricing.totalGross, 400);
    assert.equal(pricing.totalGrossInOre, 40000);

    // Moms på 400 kr = 80 kr
    assert.equal(pricing.totalVat, 80);
  });

  it("ska dynamiskt räkna om moms för EU-land (t.ex. Tyskland 19%)", () => {
    const items = [
      { id: "1", title: "Strumpa", price: 119, quantity: 1 }, // 119 kr inkl moms
    ];

    // Med tysk moms (19%):
    // Varuvärde exkl. moms = 119 / 1.19 = 100 kr
    // Varumoms = 19 kr
    const pricing = calculateOrderPricing(items, "DE", 0); // Fri frakt för test

    assert.equal(pricing.countryCode, "DE");
    assert.equal(pricing.vatPercentageText, "19%");
    assert.equal(pricing.subtotalGross, 119);
    assert.equal(pricing.subtotalNet, 100);
    assert.equal(pricing.subtotalVat, 19);
    assert.equal(pricing.totalVat, 19);
    assert.equal(pricing.totalGross, 119);
    assert.equal(pricing.totalGrossInOre, 11900);
  });

  it("ska hantera tom varukorg korrekt utan krascher", () => {
    const pricing = calculateOrderPricing([], "SE");

    assert.equal(pricing.subtotalGross, 0);
    assert.equal(pricing.shippingGross, 0);
    assert.equal(pricing.totalGross, 0);
    assert.equal(pricing.totalVat, 0);
    assert.equal(pricing.totalGrossInOre, 0);
  });

  it("ska formatera valuta korrekt enligt svensk standard", () => {
    const formatted = formatSEK(299);
    // Ska innehålla 299 och SEK eller kr
    assert.match(formatted, /299/);
  });
});
