import Image from "next/image";
import type { Product } from "@/products/types";
import { asset } from "@/lib/asset";
import { Bottle } from "./Bottle";

interface ProductVisualProps {
  product: Product;
  className?: string;
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
export function ProductVisual({ product, className, sizes = "(min-width: 1024px) 33vw, 80vw", priority }: ProductVisualProps) {
  if (product.image) {
    return (
      <div className={`relative ${className ?? ""}`}>
        <Image
          src={asset(product.image)}
          alt={product.name}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain"
        />
      </div>
    );
  }
  return (
    <Bottle
      shape={product.visual.shape}
      tint={product.visual.tint}
      label={product.visual.label}
      className={className}
    />
  );
}
