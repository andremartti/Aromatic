"use client";

import { Suspense, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { Product } from "@/products/types";
import { getCategory, photoFor } from "@/products/products";
import { commerce } from "@/lib/commerce";
import { joinList } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { PriceTag } from "./PriceTag";
import { CtaZone } from "./CtaZone";
import { WhatsAppIcon } from "./icons";

const EASE_FLOW = [0.22, 1, 0.36, 1] as const;

/**
 * Ficha de producto. Acepta ?aroma=<id>. El HTML estático trae el aroma por
 * defecto; al hidratar se aplica el de la URL.
 */
export function ProductDetail({ product }: { product: Product }) {
  return (
    <Suspense fallback={<ProductDetailView product={product} />}>
      <FromUrl product={product} />
    </Suspense>
  );
}

function FromUrl({ product }: { product: Product }) {
  const aroma = useSearchParams().get("aroma");
  return <ProductDetailView key={aroma ?? "default"} product={product} initialFragranceId={aroma} />;
}

function ProductDetailView({ product, initialFragranceId }: { product: Product; initialFragranceId?: string | null }) {
  const uid = useId();
  const reduce = useReducedMotion();
  const category = getCategory(product.category);
  const [fragranceId, setFragranceId] = useState(
    product.fragrances.some((f) => f.id === initialFragranceId) ? initialFragranceId! : product.fragrances[0]?.id,
  );
  const [presentationId, setPresentationId] = useState(product.presentations[0]?.id);
  const fragrance = product.fragrances.find((f) => f.id === fragranceId) ?? product.fragrances[0];
  const presentation = product.presentations.find((p) => p.id === presentationId) ?? product.presentations[0];

  // Inclinación de 2-3° siguiendo el ratón (solo escritorio, sin movimiento reducido).
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 120, damping: 18 });
  const rotateY = useSpring(ry, { stiffness: 120, damping: 18 });

  if (!fragrance || !presentation) return null;
  const photo = photoFor(product, fragrance.id);
  const href = commerce.checkoutUrl([{ product, fragrance, presentation, quantity: 1 }]);
  const soldOut = commerce.availability(presentation) === "out_of_stock";

  return (
    <div className="detail-grid">
      <motion.div
        className="detail-visual in-settle"
        style={{ "--tint": fragrance.tint } as React.CSSProperties}
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          ry.set(((e.clientX - r.left) / r.width - 0.5) * 5);
          rx.set(-((e.clientY - r.top) / r.height - 0.5) * 4);
        }}
        onPointerLeave={() => {
          rx.set(0);
          ry.set(0);
        }}
      >
        <motion.div className="detail-tilt" style={{ rotateX, rotateY, transformPerspective: 1200 }}>
          <div className="detail-atmos">
            <div className="atmos-layer" style={{ transition: "background 700ms ease" }} aria-hidden="true" />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={photo.base}
                className="detail-cutout"
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.3 } }}
                transition={{ duration: 0.6, ease: EASE_FLOW }}
              >
                <span className="bottle-float">
                  <ProductImage
                    photo={photo}
                    alt={product.fragrances.length > 1 ? `${product.name}, aroma ${fragrance.name}` : product.name}
                    sizes="(min-width: 1024px) 30vw, 60vw"
                    priority
                  />
                </span>
                <span className="bottle-shadow" aria-hidden="true" />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      <div className="detail-info">
        <p className="eyebrow in-rise" style={{ "--d": "150ms" } as React.CSSProperties}>
          {product.use}
        </p>
        <h1 className="serif in-reveal mt-4 text-heading" style={{ "--d": "250ms" } as React.CSSProperties}>
          <span className="sr-only">AROMATIC </span>
          {product.shortName}
        </h1>
        <span className="hairline in-draw mt-6 block w-16 text-gold" style={{ "--d": "450ms" } as React.CSSProperties} aria-hidden="true" />
        <p className="in-rise mt-6 max-w-[40ch] text-lede text-ink" style={{ "--d": "520ms" } as React.CSSProperties}>
          {product.summary}
        </p>
        <p className="in-rise mt-4 max-w-[46ch] text-body text-warm-gray" style={{ "--d": "600ms" } as React.CSSProperties}>
          {product.description}
        </p>

        <PriceTag presentation={presentation} className="mt-6 text-title" />

        <div className="detail-options in-rise" style={{ "--d": "700ms" } as React.CSSProperties}>
          <fieldset>
            <legend className="eyebrow">
              Aroma
              <span className="ml-3 text-small font-normal normal-case tracking-normal text-charcoal">{fragrance.name}</span>
            </legend>
            {product.fragrances.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.fragrances.map((f) => (
                  <label key={f.id} className="chip" data-selected={f.id === fragrance.id || undefined}>
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
            ) : null}
          </fieldset>
          <fieldset>
            <legend className="eyebrow">
              Presentación
              <span className="ml-3 text-small font-normal normal-case tracking-normal text-charcoal">{presentation.label}</span>
            </legend>
            {product.presentations.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.presentations.map((p) => (
                  <label key={p.id} className="chip" data-selected={p.id === presentation.id || undefined}>
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
            ) : null}
          </fieldset>
        </div>

        <CtaZone className="in-rise mt-9">
          {soldOut ? (
            <button type="button" disabled className="btn btn-line w-full cursor-not-allowed opacity-60 sm:w-auto">
              Agotado
            </button>
          ) : (
            <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-sage w-full sm:w-auto">
              <WhatsAppIcon className="size-5" />
              {commerce.ctaLabel}
            </a>
          )}
        </CtaZone>
        <p className="mt-4 text-small text-warm-gray">
          {soldOut
            ? `${presentation.label} no está disponible por ahora.`
            : `Abre WhatsApp con tu consulta: ${product.shortName}, ${fragrance.name}, ${presentation.label}.`}
        </p>

        <dl className="detail-spec">
          <div>
            <dt className="eyebrow">Categoría</dt>
            <dd className="mt-2 text-body text-charcoal">{category?.name}</dd>
          </div>
          <div>
            <dt className="eyebrow">{product.fragrances.length > 1 ? "Aromas" : "Aroma"}</dt>
            <dd className="mt-2 text-body text-charcoal">{joinList(product.fragrances.map((f) => f.name))}</dd>
          </div>
          <div>
            <dt className="eyebrow">{product.presentations.length > 1 ? "Presentaciones" : "Presentación"}</dt>
            <dd className="mt-2 text-body text-charcoal">{joinList(product.presentations.map((p) => p.label))}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
