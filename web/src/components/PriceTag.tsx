import type { Presentation, Product } from "@/products/types";
import { presentationPrice, productPrice } from "@/lib/format";

interface PriceTagProps {
  product?: Product;
  presentation?: Presentation;
  className?: string;
}

/**
 * Precio de un producto o presentación.
 * No renderiza nada mientras los precios estén desactivados
 * (`features.prices` en src/config/site.ts) o no estén definidos.
 */
export function PriceTag({ product, presentation, className }: PriceTagProps) {
  const text = presentation ? presentationPrice(presentation) : product ? productPrice(product) : null;
  if (!text) return null;
  return <p className={`tabular text-body text-charcoal ${className ?? ""}`}>{text}</p>;
}
