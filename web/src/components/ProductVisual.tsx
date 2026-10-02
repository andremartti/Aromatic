import type { Product } from "@/products/types";
import { asset } from "@/lib/asset";
import { Bottle } from "./Bottle";
import { ProductPhoto } from "./ProductPhoto";

interface ProductVisualProps {
  product: Product;
  className?: string;
  /** Línea inferior de la etiqueta ilustrada (aroma o presentación). */
  detail?: string;
  /** Tinte del líquido de la ilustración (por ejemplo, el del aroma elegido). */
  tint?: string;
  /** Presentación elegida: puede cambiar el envase ilustrado. */
  presentationId?: string;
  /** Tamaños para next/image cuando exista fotografía. */
  sizes?: string;
  priority?: boolean;
}

/**
 * Punto único donde se decide qué imagen ver de un producto:
 * - si `product.image` tiene ruta → fotografía real;
 * - si no → ilustración del envase.
 * Para cambiar a fotos reales basta con editar `image` en products.ts.
 */
export function ProductVisual({
  product,
  className,
  detail,
  tint,
  presentationId,
  sizes = "(min-width: 1024px) 40vw, 90vw",
  priority,
}: ProductVisualProps) {
  const illustration = (
    <Bottle
      shape={(presentationId && product.visual.shapeByPresentation?.[presentationId]) || product.visual.shape}
      tint={tint ?? product.visual.tint}
      name={product.shortName}
      detail={detail ?? product.presentations[0]?.label}
      className={className}
    />
  );
  if (!product.image) return illustration;
  return (
    <ProductPhoto
      src={asset(product.image)}
      alt={product.imageAlt ?? product.name}
      sizes={sizes}
      priority={priority}
      className={className}
      fallback={illustration}
    />
  );
}
