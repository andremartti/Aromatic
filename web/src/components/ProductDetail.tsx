"use client";

import { Suspense, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Product } from "@/products/types";
import { getCategory } from "@/products/products";
import { commerce } from "@/lib/commerce";
import { joinList } from "@/lib/format";
import { ProductVisual } from "./ProductVisual";
import { PriceTag } from "./PriceTag";
import { WhatsAppIcon } from "./icons";
import { CtaZone } from "./CtaZone";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface ProductDetailProps {
  product: Product;
}

/**
 * Detalle de producto. Acepta ?aroma=<id> para llegar con un aroma elegido
 * (desde "Encuentra tu aroma"). El HTML estático trae el aroma por defecto;
 * al hidratar se aplica el de la URL.
 */
export function ProductDetail({ product }: ProductDetailProps) {
  return (
    <Suspense fallback={<ProductDetailView product={product} />}>
      <ProductDetailFromUrl product={product} />
    </Suspense>
  );
}

function ProductDetailFromUrl({ product }: ProductDetailProps) {
  const aroma = useSearchParams().get("aroma");
  return <ProductDetailView key={aroma ?? "default"} product={product} initialFragranceId={aroma} />;
}

function ProductDetailView({ product, initialFragranceId }: ProductDetailProps & { initialFragranceId?: string | null }) {
  const uid = useId();
  const category = getCategory(product.category);
  const [fragranceId, setFragranceId] = useState(
    product.fragrances.some((f) => f.id === initialFragranceId) ? initialFragranceId! : product.fragrances[0]?.id,
  );
  const [presentationId, setPresentationId] = useState(product.presentations[0]?.id);
  const fragrance = product.fragrances.find((f) => f.id === fragranceId) ?? product.fragrances[0];
  const presentation = product.presentations.find((p) => p.id === presentationId) ?? product.presentations[0];
  if (!fragrance || !presentation) return null;

  const tint = product.fragrances.length > 1 ? fragrance.tint : product.visual.tint;
  const href = commerce.checkoutUrl([{ product, fragrance, presentation, quantity: 1 }]);
  // Con inventario cargado (stock: 0) la presentación se muestra agotada.
  const soldOut = commerce.availability(presentation) === "out_of_stock";
  const visualKey = `${fragrance.id}-${presentation.id}`;

  return (
    <div className="detail-grid">
      <div className="detail-media">
        <div className="label-stock detail-plate-panel">
          <div className="detail-plate" style={{ "--plate-tint": tint } as React.CSSProperties}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={visualKey}
                className="detail-visual-wrap"
                initial={{ opacity: 0, filter: "blur(6px)", transform: "translateY(10px)" }}
                animate={{ opacity: 1, filter: "blur(0px)", transform: "translateY(0px)", transitionEnd: { filter: "none" } }}
                exit={{ opacity: 0, filter: "blur(6px)", transition: { duration: 0.14 } }}
                transition={{ duration: 0.32, ease: EASE_OUT }}
              >
                <ProductVisual
                  product={product}
                  tint={tint}
                  presentationId={presentation.id}
                  detail={product.fragrances.length > 1 ? fragrance.name : presentation.label}
                  className="detail-visual"
                  sizes="(min-width: 1024px) 50vw, 92vw"
                  priority
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="detail-info">
        <h1>
          <span className="field-label block text-charcoal">AROMATIC</span>
          <span className="display mt-3 block text-display">{product.shortName}</span>
        </h1>
        {category && category.name !== product.shortName ? (
          <p className="mt-3 text-body text-muted">{category.name}</p>
        ) : null}
        <p className="mt-7 max-w-[46ch] text-lede text-ink">{product.description}</p>

        <PriceTag presentation={presentation} className="mt-6 text-title" />

        <div className="detail-options">
          {product.fragrances.length > 1 ? (
            <fieldset>
              <legend className="field-label text-muted">
                Aroma <span className="ml-2 text-small font-normal normal-case tracking-normal text-charcoal [font-stretch:100%]">{fragrance.name}</span>
              </legend>
              <div className="option-chips mt-3">
                {product.fragrances.map((f) => (
                  <label key={f.id} className="option-chip" data-selected={f.id === fragrance.id || undefined}>
                    <input
                      type="radio"
                      name={`${uid}-aroma`}
                      value={f.id}
                      checked={f.id === fragrance.id}
                      onChange={() => setFragranceId(f.id)}
                      className="sr-only"
                    />
                    {f.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <div>
              <p className="field-label text-muted">Aroma</p>
              <p className="mt-2 text-body text-charcoal">{fragrance.name}</p>
            </div>
          )}

          {product.presentations.length > 1 ? (
            <fieldset>
              <legend className="field-label text-muted">Presentación</legend>
              <div className="option-chips mt-3">
                {product.presentations.map((p) => (
                  <label key={p.id} className="option-chip" data-selected={p.id === presentation.id || undefined}>
                    <input
                      type="radio"
                      name={`${uid}-presentacion`}
                      value={p.id}
                      checked={p.id === presentation.id}
                      onChange={() => setPresentationId(p.id)}
                      className="sr-only"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <div>
              <p className="field-label text-muted">Presentación</p>
              <p className="mt-2 text-body text-charcoal">{presentation.label}</p>
            </div>
          )}
        </div>

        <CtaZone className="mt-9">
          {soldOut ? (
            <button type="button" disabled className="btn btn-outline w-full cursor-not-allowed opacity-60 sm:w-auto sm:min-w-[22rem]">
              Agotado
            </button>
          ) : (
            <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-sage w-full sm:w-auto sm:min-w-[22rem]">
              <WhatsAppIcon className="size-5" />
              {commerce.ctaLabel}
            </a>
          )}
        </CtaZone>
        <p className="mt-4 text-small text-muted">
          {soldOut
            ? `${presentation.label} no está disponible por ahora.`
            : `Abre WhatsApp con tu pedido ya escrito: ${product.shortName}, ${fragrance.name}, ${presentation.label}.`}
        </p>

        <dl className="detail-spec">
          <div>
            <dt className="field-label text-muted">Producto</dt>
            <dd className="mt-1.5 text-body text-charcoal">{product.name}</dd>
          </div>
          <div>
            <dt className="field-label text-muted">{product.fragrances.length > 1 ? "Aromas" : "Aroma"}</dt>
            <dd className="mt-1.5 text-body text-charcoal">{joinList(product.fragrances.map((f) => f.name))}</dd>
          </div>
          <div>
            <dt className="field-label text-muted">{product.presentations.length > 1 ? "Presentaciones" : "Presentación"}</dt>
            <dd className="mt-1.5 text-body text-charcoal">{joinList(product.presentations.map((p) => p.label))}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
