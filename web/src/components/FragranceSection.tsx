"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { allFragrances, productsWithFragrance } from "@/products/products";
import type { ContainerShape, Product } from "@/products/types";
import { joinList } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { site } from "@/config/site";
import { ProductVisual } from "./ProductVisual";
import { ArrowIcon, WhatsAppIcon } from "./icons";
import { CtaZone } from "./CtaZone";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Un envase por cada forma distinta entre las presentaciones del producto. */
function containersOf(product: Product): { shape: ContainerShape; presentationId: string }[] {
  const byShape = new Map<ContainerShape, string>();
  for (const presentation of product.presentations) {
    const shape = product.visual.shapeByPresentation?.[presentation.id] ?? product.visual.shape;
    if (!byShape.has(shape)) byShape.set(shape, presentation.id);
  }
  return [...byShape].map(([shape, presentationId]) => ({ shape, presentationId }));
}

/**
 * "Encuentra tu aroma.": selector con etiqueta viva.
 * Elegir un aroma re-etiqueta la etiqueta grande: el nombre se re-entinta,
 * aparecen los productos que lo llevan (con su etiqueta impresa en ese aroma)
 * y el botón de WhatsApp se reescribe con el pedido.
 * Solo usa los aromas reales del catálogo (derivados de los productos).
 * Con "reducir movimiento", MotionConfig (Providers) quita los
 * desplazamientos y conserva el fundido.
 */
export function FragranceSection() {
  const fragrances = allFragrances();
  const [selectedId, setSelectedId] = useState(fragrances[0]?.id ?? "");
  const selected = fragrances.find((f) => f.id === selectedId) ?? fragrances[0];
  if (!selected) return null;
  const products = productsWithFragrance(selected.id);
  const message = `Hola ${site.name}, me interesa el aroma ${selected.name} en ${joinList(
    products.map((p) => p.name),
  )}. ¿Me confirman disponibilidad?`;

  return (
    <section id="aromas" className="aromas-field py-section" aria-labelledby="aromas-title">
      <div className="frame aromas-grid">
        <div className="aromas-intro">
          <h2 id="aromas-title" className="display reveal-ink text-heading">
            Encuentra tu aroma.
          </h2>
          <p className="mt-5 max-w-[36ch] text-lede text-bronze">
            Seis aromas para el jabón líquido. El suavizante y el detergente, en Floral.
          </p>

          <fieldset className="aroma-options mt-10">
            <legend className="sr-only">Elige un aroma</legend>
            {fragrances.map((fragrance) => {
              const count = productsWithFragrance(fragrance.id).length;
              const isSelected = fragrance.id === selected.id;
              return (
                <label key={fragrance.id} className="aroma-option" data-selected={isSelected || undefined}>
                  <input
                    type="radio"
                    name="aroma"
                    value={fragrance.id}
                    checked={isSelected}
                    onChange={() => setSelectedId(fragrance.id)}
                    className="sr-only"
                  />
                  <span className="aroma-option-name display">{fragrance.name}</span>
                  <span className="aroma-option-count field-label tabular">
                    {count} {count === 1 ? "producto" : "productos"}
                  </span>
                </label>
              );
            })}
          </fieldset>
        </div>

        <div className="aroma-label label-stock">
          <div className="aroma-label-band" style={{ backgroundColor: selected.tint }} aria-hidden="true" />
          <div className="aroma-label-inner">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, filter: "blur(4px)", transform: "translateY(8px)" }}
                animate={{ opacity: 1, filter: "blur(0px)", transform: "translateY(0px)", transitionEnd: { filter: "none" } }}
                exit={{ opacity: 0, filter: "blur(4px)", transform: "translateY(-4px)", transition: { duration: 0.12 } }}
                transition={{ duration: 0.24, ease: EASE_OUT }}
              >
                <p className="field-label text-muted">Aroma</p>
                <p className="aroma-label-name display" aria-live="polite">
                  {selected.name}
                </p>

                <div className="aroma-label-bottles" aria-hidden="true">
                  {products.flatMap((product) =>
                    containersOf(product).map(({ shape, presentationId }) => (
                      <ProductVisual
                        key={`${product.id}-${shape}`}
                        product={product}
                        presentationId={presentationId}
                        detail={selected.name}
                        tint={selected.tint}
                        className={shape === "pump" ? "aroma-bottle is-pump" : "aroma-bottle"}
                      />
                    )),
                  )}
                </div>

                <p className="field-label mt-8 text-muted">Disponible en</p>
                <ul className="mt-2">
                  {products.map((product) => (
                    <li key={product.id} className="aroma-product">
                      <Link href={`/productos/${product.slug}/?aroma=${selected.id}`} className="aroma-product-link">
                        <span className="display text-[1.375rem] leading-tight">{product.shortName}</span>
                        <span className="text-small text-muted">{joinList(product.presentations.map((p) => p.label))}</span>
                        <ArrowIcon className="aroma-product-arrow size-4 text-charcoal" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>

            <CtaZone className="mt-8">
              <a href={whatsappLink(message)} target="_blank" rel="noopener noreferrer" className="btn btn-sage w-full">
                <WhatsAppIcon className="size-5" />
                Comprar por WhatsApp
              </a>
            </CtaZone>
          </div>
        </div>
      </div>
    </section>
  );
}
