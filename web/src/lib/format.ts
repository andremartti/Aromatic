import { features, site } from "@/config/site";
import type { Presentation, Product } from "@/products/types";

const formatter = new Intl.NumberFormat(site.currency.locale, {
  style: "currency",
  currency: site.currency.code,
  minimumFractionDigits: 2,
});

/**
 * Precio formateado, o `null` cuando no debe mostrarse:
 * - precios desactivados (`features.prices === false`), o
 * - precio no definido / inválido.
 * Ningún componente decide por su cuenta si mostrar un precio: todos pasan por aquí.
 */
export function formatPrice(price: number | null): string | null {
  if (!features.prices) return null;
  if (price === null || !Number.isFinite(price) || price <= 0) return null;
  return formatter.format(price);
}

/** Precio de una presentación, o `null` si no se muestra. */
export function presentationPrice(p: Presentation): string | null {
  return formatPrice(p.price);
}

/** Precio "desde" de un producto (menor precio definido), o `null` si no se muestra. */
export function productPrice(product: Product): string | null {
  if (!features.prices) return null;
  const prices = product.presentations.map((p) => p.price).filter((p): p is number => p !== null && p > 0);
  if (prices.length === 0) return null;
  const text = formatPrice(Math.min(...prices));
  if (!text) return null;
  return prices.length < product.presentations.length || new Set(prices).size > 1 ? `Desde ${text}` : text;
}

/** Une una lista en español: "A, B y C". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}
