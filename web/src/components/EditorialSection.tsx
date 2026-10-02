import Link from "next/link";
import { getProductBySlug } from "@/products/products";
import { ProductVisual } from "./ProductVisual";

/**
 * "Tu hogar también merece sentirse especial.": pieza editorial.
 * Un primer plano del galón de suavizante, recortado por el borde de la
 * sección como en una fotografía de bodegón, con el titular a gran escala.
 * El movimiento (ligado al scroll, solo CSS) desplaza las líneas del titular
 * en sentidos opuestos y eleva el envase muy ligeramente.
 */
export function EditorialSection() {
  const suavizante = getProductBySlug("suavizante");
  return (
    <section className="editorial" aria-labelledby="editorial-title">
      <div className="frame editorial-frame">
        <h2 id="editorial-title" className="editorial-title display">
          <span className="editorial-line is-a">Tu hogar</span>
          <span className="editorial-line is-b">también merece</span>
          <span className="editorial-line is-c">sentirse especial.</span>
        </h2>

        <div className="editorial-copy reveal">
          <p className="max-w-[34ch] text-lede text-ink">
            Ropa suave al tacto, manos limpias y un aroma que eliges tú. Los detalles de todos los días también cuentan.
          </p>
          <Link href="/#aromas" className="ink-link mt-6">
            Encuentra tu aroma
          </Link>
        </div>

        {suavizante ? (
          <div className="editorial-still" aria-hidden="true">
            <ProductVisual product={suavizante} detail="Floral" className="editorial-bottle" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
