/**
 * Capa de comercio de AROMATIC.
 *
 * Hoy la compra se concreta por WhatsApp. La interfaz `CommerceProvider`
 * aísla esa decisión: cuando exista un ecommerce (carrito, checkout, pagos,
 * inventario) se implementa otro proveedor y se cambia `commerce` abajo,
 * sin tocar los componentes visuales.
 */
import type { Fragrance, Presentation, Product } from "@/products/types";
import { presentationPrice } from "./format";
import { whatsappLink } from "./whatsapp";
import { site } from "@/config/site";

export interface CartLine {
  product: Product;
  presentation: Presentation;
  fragrance: Fragrance;
  quantity: number;
}

export type Availability = "available" | "out_of_stock" | "on_request";

export interface CommerceProvider {
  /** Etiqueta del botón principal de compra. */
  readonly ctaLabel: string;
  /** Disponibilidad de una presentación según su inventario. */
  availability(presentation: Presentation): Availability;
  /**
   * Inicia la compra de una o varias líneas. Devuelve la URL a la que se
   * debe dirigir al cliente (WhatsApp, checkout, pasarela de pago…).
   */
  checkoutUrl(lines: CartLine[]): string;
}

function availabilityFromStock(p: Presentation): Availability {
  if (p.stock === null) return "on_request";
  return p.stock > 0 ? "available" : "out_of_stock";
}

function describeLine(line: CartLine): string {
  const qty = line.quantity > 1 ? `${line.quantity} x ` : "";
  // El precio solo aparece si los precios están activos (features.prices).
  const price = presentationPrice(line.presentation);
  return `${qty}${line.product.name}, aroma ${line.fragrance.name}, presentación ${line.presentation.label}${price ? ` (${price})` : ""}`;
}

export const whatsappCommerce: CommerceProvider = {
  ctaLabel: "Solicitar información",
  availability: availabilityFromStock,
  checkoutUrl(lines) {
    const detail = lines.map((l) => `- ${describeLine(l)}`).join("\n");
    return whatsappLink(`Hola ${site.name}, me gustaría recibir información sobre:\n${detail}`);
  },
};

/** Proveedor activo. Reemplazar aquí al integrar un ecommerce. */
export const commerce: CommerceProvider = whatsappCommerce;
