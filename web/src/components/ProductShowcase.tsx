import { PRODUCTS } from "@/products/products";
import { ProductLabel } from "./ProductLabel";

/**
 * "Descubre AROMATIC": la vitrina. El producto destacado ocupa la etiqueta
 * grande; el resto se apila a su lado. Funciona con cualquier cantidad de
 * productos: los que no caben junto al destacado continúan en filas.
 */
export function ProductShowcase() {
  const featured = PRODUCTS.find((p) => p.featured) ?? PRODUCTS[0];
  const others = PRODUCTS.filter((p) => p.id !== featured.id);

  return (
    <section id="productos" className="py-section" aria-labelledby="productos-title">
      <div className="frame">
        <h2 id="productos-title" className="display reveal-ink text-heading">
          Descubre AROMATIC
        </h2>
        <p className="mt-5 max-w-[40ch] text-lede text-muted">Creados para mantener hogares limpios y frescos.</p>

        <div className="showcase-grid mt-band">
          <div className="showcase-feature reveal">
            <ProductLabel product={featured} variant="feature" />
          </div>
          {others.map((product) => (
            <div key={product.id} className="showcase-item reveal">
              <ProductLabel product={product} variant="compact" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
