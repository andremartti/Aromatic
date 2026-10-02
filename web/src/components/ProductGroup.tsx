import { PRODUCTS } from "@/products/products";
import { ProductVisual } from "./ProductVisual";

interface ProductGroupProps {
  className?: string;
  /** Activa la entrada escalonada de los envases (solo en el hero). */
  animate?: boolean;
}

/**
 * Los tres envases AROMATIC agrupados sobre una misma superficie, como en una
 * fotografía de bodegón: dos galones detrás y el jabón líquido al frente.
 * Si un producto tiene fotografía (`image`), se usa en lugar de la ilustración.
 */
export function ProductGroup({ className = "", animate = false }: ProductGroupProps) {
  const suavizante = PRODUCTS.find((p) => p.id === "suavizante");
  const detergente = PRODUCTS.find((p) => p.id === "detergente");
  const jabon = PRODUCTS.find((p) => p.id === "jabon-manos");
  const rise = animate ? "rise-in" : "";

  return (
    <div className={`relative ${className}`} role="img" aria-label="Envases de AROMATIC Suavizante, Detergente Líquido y Jabón Líquido">
      {suavizante ? (
        <div
          className={`group-back-left absolute bottom-0 left-0 w-[56%] ${rise}`}
          style={{ "--delay": "300ms" } as React.CSSProperties}
        >
          <ProductVisual product={suavizante} className="aspect-[4/5] w-full" />
        </div>
      ) : null}
      {detergente ? (
        <div
          className={`group-back-right absolute bottom-0 right-0 w-[53%] ${rise}`}
          style={{ "--delay": "360ms" } as React.CSSProperties}
        >
          <ProductVisual product={detergente} className="aspect-[4/5] w-full" />
        </div>
      ) : null}
      {jabon ? (
        <div
          className={`group-front absolute bottom-0 left-1/2 w-[31%] -translate-x-[44%] ${rise}`}
          style={{ "--delay": "420ms" } as React.CSSProperties}
        >
          <ProductVisual product={jabon} className="aspect-[1/2] w-full" />
        </div>
      ) : null}
    </div>
  );
}
