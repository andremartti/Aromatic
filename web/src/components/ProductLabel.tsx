import Link from "next/link";
import type { Product } from "@/products/types";
import { getCategory } from "@/products/products";
import { joinList } from "@/lib/format";
import { ProductVisual } from "./ProductVisual";
import { PriceTag } from "./PriceTag";
import { ArrowIcon } from "./icons";

interface ProductLabelProps {
  product: Product;
  /** "feature": etiqueta grande vertical. "compact": etiqueta horizontal. */
  variant?: "feature" | "compact";
  headingLevel?: "h2" | "h3";
}

/**
 * Producto compuesto como una etiqueta impresa: placa con el envase arriba
 * (o a un lado) y los campos de la etiqueta: aroma y presentación.
 * Toda la etiqueta es un único enlace (el nombre), sin enlaces duplicados.
 */
export function ProductLabel({ product, variant = "compact", headingLevel: Heading = "h3" }: ProductLabelProps) {
  const category = getCategory(product.category);
  const aromas = product.fragrances.map((f) => f.name);
  const presentations = product.presentations.map((p) => p.label);

  return (
    <article className={`product-label label-stock group ${variant === "feature" ? "is-feature" : "is-compact"}`}>
      <div className="product-label-plate" style={{ "--plate-tint": product.visual.tint } as React.CSSProperties}>
        <ProductVisual
          product={product}
          className="product-label-visual"
          sizes={variant === "feature" ? "(min-width: 1024px) 50vw, 92vw" : "(min-width: 1024px) 18vw, 92vw"}
        />
      </div>

      <div className="product-label-body">
        <Heading>
          <span className="field-label block text-charcoal">AROMATIC</span>
          <Link href={`/productos/${product.slug}/`} className="product-label-link display mt-3 block text-title">
            {product.shortName}
          </Link>
        </Heading>
        {category && category.name !== product.shortName ? (
          <p className="mt-1.5 text-small text-muted">{category.name}</p>
        ) : null}
        <p className="mt-4 max-w-[38ch] text-body text-ink">{product.shortDescription}</p>

        <dl className="product-fields mt-6">
          <div>
            <dt className="field-label text-muted">{aromas.length > 1 ? "Aromas" : "Aroma"}</dt>
            <dd className="mt-1.5 text-body text-charcoal">{joinList(aromas)}</dd>
          </div>
          <div>
            <dt className="field-label text-muted">{presentations.length > 1 ? "Presentaciones" : "Presentación"}</dt>
            <dd className="mt-1.5 text-body text-charcoal">{joinList(presentations)}</dd>
          </div>
        </dl>

        <PriceTag product={product} className="mt-5" />

        <div className="product-label-cta-row">
          <span className="ink-link" aria-hidden="true">
            Ver producto
            <ArrowIcon className="btn-arrow size-4" />
          </span>
        </div>
      </div>
    </article>
  );
}
