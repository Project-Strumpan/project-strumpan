/**
 * Moms (VAT) och prisberäkning för Strumpan e-handel.
 *
 * Uppfyller:
 * - Svensk standardmoms (25%) som initial default.
 * - Förberedd för EU-moms (OSS - One Stop Shop) med landsspecifika momssatser.
 * - Tydlig uppdelning av delsumma, frakt, moms och totalsumma.
 * - Beräkning i ören för Stripe API (minsta valutaenhet).
 */

export type EUCountry = {
  code: string;
  name: string;
  vatRate: number; // e.g. 0.25 for 25%
};

/**
 * Momstabell förberedd för EU-länder.
 * Standard/initialt aktivt: Sverige (SE, 25%).
 */
export const SUPPORTED_COUNTRIES: Record<string, EUCountry> = {
  SE: { code: "SE", name: "Sverige", vatRate: 0.25 },
  DK: { code: "DK", name: "Danmark", vatRate: 0.25 },
  FI: { code: "FI", name: "Finland", vatRate: 0.255 },
  DE: { code: "DE", name: "Tyskland", vatRate: 0.19 },
  FR: { code: "FR", name: "Frankrike", vatRate: 0.20 },
  NL: { code: "NL", name: "Nederländerna", vatRate: 0.21 },
  ES: { code: "ES", name: "Spanien", vatRate: 0.21 },
  IT: { code: "IT", name: "Italien", vatRate: 0.22 },
  NO: { code: "NO", name: "Norge", vatRate: 0.25 }, // EES
};

export const DEFAULT_COUNTRY_CODE = "SE";

export interface OrderItemInput {
  id: string | number;
  title: string;
  price: number; // Pris per st i SEK (inkl. moms för konsument)
  quantity: number;
  picture_url?: string | null;
  size?: string;
  color?: string;
}

export interface PricingSummary {
  countryCode: string;
  countryName: string;
  vatRate: number; // t.ex. 0.25
  vatPercentageText: string; // t.ex. "25%"

  // Varuvärde
  subtotalGross: number; // Delsumma artiklar inkl. moms (SEK)
  subtotalNet: number; // Delsumma artiklar exkl. moms (SEK)
  subtotalVat: number; // Momsbelopp på artiklar (SEK)

  // Frakt
  shippingGross: number; // Frakt inkl. moms (SEK)
  shippingNet: number; // Frakt exkl. moms (SEK)
  shippingVat: number; // Momsbelopp på frakt (SEK)
  isFreeShipping: boolean;

  // Totaler
  totalVat: number; // Total moms (artiklar + frakt)
  totalGross: number; // Totalbelopp att betala (inkl. moms)
  totalGrossInOre: number; // För Stripe PaymentIntent (amount i öre, heltal)
  currency: string;
}

const DEFAULT_SHIPPING_COST = 39; // Standardfrakt i SEK inkl moms
const FREE_SHIPPING_THRESHOLD = 399; // Fri frakt över 399 SEK

/**
 * Hämtar momssats för ett land. Fallback till SE (25%) om landet saknas.
 */
export function getVatRateForCountry(countryCode?: string): EUCountry {
  const code = (countryCode || DEFAULT_COUNTRY_CODE).toUpperCase();
  return SUPPORTED_COUNTRIES[code] || SUPPORTED_COUNTRIES[DEFAULT_COUNTRY_CODE];
}

/**
 * Beräknar komplett pris- och momssammanfattning för en varukorg/order.
 */
export function calculateOrderPricing(
  items: OrderItemInput[],
  countryCode: string = DEFAULT_COUNTRY_CODE,
  shippingCostOverride?: number
): PricingSummary {
  const country = getVatRateForCountry(countryCode);
  const vatRate = country.vatRate;

  // 1. Delsumma varor (konsumentpriser anges inkl. moms)
  const subtotalGross = items.reduce(
    (sum, item) => sum + Math.max(0, item.price) * Math.max(0, item.quantity),
    0
  );

  // Momsdel på varor: subtotalGross - (subtotalGross / (1 + vatRate))
  const subtotalNet = subtotalGross / (1 + vatRate);
  const subtotalVat = subtotalGross - subtotalNet;

  // 2. Frakt
  const shippingGross =
    shippingCostOverride !== undefined
      ? shippingCostOverride
      : subtotalGross >= FREE_SHIPPING_THRESHOLD || items.length === 0
      ? 0
      : DEFAULT_SHIPPING_COST;

  const isFreeShipping = shippingGross === 0 && items.length > 0;
  const shippingNet = shippingGross / (1 + vatRate);
  const shippingVat = shippingGross - shippingNet;

  // 3. Totaler
  const totalGross = subtotalGross + shippingGross;
  const totalVat = subtotalVat + shippingVat;

  // Stripe kräver belopp i minsta enhet (öre för SEK) som heltal
  const totalGrossInOre = Math.round(totalGross * 100);

  return {
    countryCode: country.code,
    countryName: country.name,
    vatRate,
    vatPercentageText: `${Math.round(vatRate * 100)}%`,
    subtotalGross: roundToTwoDecimals(subtotalGross),
    subtotalNet: roundToTwoDecimals(subtotalNet),
    subtotalVat: roundToTwoDecimals(subtotalVat),
    shippingGross: roundToTwoDecimals(shippingGross),
    shippingNet: roundToTwoDecimals(shippingNet),
    shippingVat: roundToTwoDecimals(shippingVat),
    isFreeShipping,
    totalVat: roundToTwoDecimals(totalVat),
    totalGross: roundToTwoDecimals(totalGross),
    totalGrossInOre,
    currency: "SEK",
  };
}

export function formatSEK(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
