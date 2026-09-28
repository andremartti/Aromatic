import { site } from "@/config/site";
import type { Presentation, Product } from "@/products/types";

const formatter = new Intl.NumberFormat(site.currency.locale, {
  style: "currency",
  currency: site.currency.code,
  minimumFractionDigits: 2,
});

/** Precio formateado o `null` si todavía no está definido. */
export function formatPrice(price: number | null): string | null {
  if (price === null || !Number.isFinite(price) || price <= 0) return null;
  return formatter.format(price);
}

export const PRICE_ON_REQUEST = "Consultar precio";

/** Texto de precio para una tarjeta: el menor precio definido del producto. */
export function priceLabel(product: Product): string {
  const prices = product.presentations
    .map((p) => p.price)
    .filter((p): p is number => p !== null && p > 0);
  if (prices.length === 0) return PRICE_ON_REQUEST;
  const min = Math.min(...prices);
  const text = formatPrice(min)!;
  return prices.length < product.presentations.length || new Set(prices).size > 1 ? `Desde ${text}` : text;
}

export function presentationPriceLabel(p: Presentation): string {
  return formatPrice(p.price) ?? PRICE_ON_REQUEST;
}

export function listLabels(items: { name?: string; label?: string }[]): string {
  return items.map((i) => i.name ?? i.label).join(" · ");
}
