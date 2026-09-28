"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Product } from "@/products/types";
import { getCategory } from "@/products/products";
import { commerce } from "@/lib/commerce";
import { presentationPriceLabel } from "@/lib/format";
import { EASE } from "./motion";
import { ProductVisual } from "./ProductVisual";

interface ProductDetailProps {
  product: Product;
  initialFragranceId?: string;
  /** "modal": dentro del modal · "page": página propia del producto. */
  context?: "modal" | "page";
  headingId?: string;
}

const AVAILABILITY_TEXT = {
  available: "Disponible",
  out_of_stock: "Agotado temporalmente",
  on_request: "Disponibilidad confirmada al momento de tu pedido",
} as const;

export function ProductDetail({ product, initialFragranceId, context = "page", headingId }: ProductDetailProps) {
  const [presentationId, setPresentationId] = useState(product.presentations[0].id);
  const [fragranceId, setFragranceId] = useState(
    product.fragrances.some((f) => f.id === initialFragranceId) ? initialFragranceId! : product.fragrances[0].id,
  );
  const [quantity, setQuantity] = useState(1);

  const presentation = product.presentations.find((p) => p.id === presentationId) ?? product.presentations[0];
  const fragrance = product.fragrances.find((f) => f.id === fragranceId) ?? product.fragrances[0];
  const availability = commerce.availability(presentation);
  const checkoutUrl = commerce.checkoutUrl([{ product, presentation, fragrance, quantity }]);
  const category = getCategory(product.category);
  const Heading = context === "page" ? "h1" : "h2";
  const isModal = context === "modal";

  return (
    <div className={`grid ${isModal ? "md:h-full md:grid-cols-[1.05fr_1fr]" : "gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20"}`}>
      {/* Imagen */}
      <div
        className={`relative flex items-end justify-center overflow-hidden ${
          isModal ? "aspect-[4/3.4] md:aspect-auto md:h-full" : "aspect-[4/4.4] rounded-[3px] lg:aspect-auto lg:min-h-[42rem]"
        }`}
        style={{ backgroundColor: product.visual.backdrop }}
      >
        <div aria-hidden="true" className="absolute inset-x-[16%] bottom-[10%] top-[12%] rounded-t-full bg-white/40" />
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="relative flex h-full w-full items-end justify-center pb-[9%]"
        >
          <ProductVisual
            product={product}
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className={product.visual.shape === "pump" ? "h-[76%] w-auto" : "h-[70%] w-auto"}
          />
        </motion.div>
        {/* Indicador de aroma seleccionado */}
        <AnimatePresence mode="wait">
          <motion.span
            key={fragrance.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="absolute bottom-5 left-5 flex items-center gap-2.5 text-[0.625rem] font-semibold tracking-[0.22em] text-muted uppercase"
          >
            <span className="h-3 w-3 rounded-full ring-1 ring-charcoal/10" style={{ backgroundColor: fragrance.swatch }} />
            Aroma {fragrance.name}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Información */}
      <div className={`flex flex-col ${isModal ? "px-6 pb-10 pt-10 md:overflow-y-auto md:px-12 md:py-12 lg:px-14" : "lg:py-6"}`}>
        <p className="eyebrow">{category?.name}</p>
        <Heading id={headingId} className="display mt-5 text-4xl md:text-5xl">
          {product.name}
        </Heading>
        <p className="mt-6 text-base leading-relaxed text-muted">{product.description}</p>

        <div className="mt-8 flex items-baseline justify-between border-y border-line py-5">
          <span className="eyebrow">Precio</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={presentation.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="font-serif text-2xl text-charcoal"
              aria-live="polite"
            >
              {presentationPriceLabel(presentation)}
            </motion.span>
          </AnimatePresence>
        </div>

        <fieldset className="mt-8">
          <legend className="eyebrow mb-4">
            Presentación{product.presentations.length === 1 ? `: ${presentation.label}` : ""}
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {product.presentations.map((p) => (
              <label key={p.id} className="relative cursor-pointer">
                <input
                  type="radio"
                  name={`presentacion-${product.id}-${context}`}
                  value={p.id}
                  checked={p.id === presentationId}
                  onChange={() => setPresentationId(p.id)}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 items-center rounded-full border border-line px-5 text-sm text-ink transition-colors duration-300 peer-checked:border-charcoal peer-checked:bg-charcoal peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-charcoal hover:border-charcoal/60">
                  {p.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="eyebrow mb-4">Aroma: {fragrance.name}</legend>
          <div className="flex flex-wrap gap-2.5">
            {product.fragrances.map((f) => (
              <label key={f.id} className="relative cursor-pointer">
                <input
                  type="radio"
                  name={`aroma-${product.id}-${context}`}
                  value={f.id}
                  checked={f.id === fragranceId}
                  onChange={() => setFragranceId(f.id)}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 items-center gap-2.5 rounded-full border border-line py-1.5 pl-2 pr-4 text-sm text-ink transition-colors duration-300 peer-checked:border-charcoal peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-charcoal hover:border-charcoal/60">
                  <span className="h-7 w-7 rounded-full ring-1 ring-charcoal/10 transition-transform duration-500" style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${f.swatch} 70%)` }} />
                  {f.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 flex items-center justify-between gap-6">
          <span className="eyebrow" id={`cantidad-${product.id}-${context}`}>
            Cantidad
          </span>
          <div className="flex items-center rounded-full border border-line" role="group" aria-labelledby={`cantidad-${product.id}-${context}`}>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-11 w-11 items-center justify-center text-lg text-ink disabled:opacity-30"
              disabled={quantity <= 1}
              aria-label="Disminuir cantidad"
            >
              −
            </button>
            <output className="w-8 text-center text-sm tabular-nums" aria-live="polite">
              {quantity}
            </output>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              className="flex h-11 w-11 items-center justify-center text-lg text-ink"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-10 space-y-4">
          <div className={isModal ? "max-md:sticky max-md:bottom-0 max-md:-mx-6 max-md:border-t max-md:border-line max-md:bg-ivory/95 max-md:px-6 max-md:py-4 max-md:backdrop-blur-md" : ""}>
          <a
            href={availability === "out_of_stock" ? undefined : checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={availability === "out_of_stock"}
            className="group relative flex min-h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-charcoal px-8 text-sm font-semibold tracking-[0.12em] text-ivory uppercase transition-colors duration-500 hover:bg-ink aria-disabled:pointer-events-none aria-disabled:opacity-40"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            <span className="relative">{availability === "out_of_stock" ? "Agotado" : commerce.ctaLabel}</span>
          </a>
          </div>
          <p className="text-center text-xs leading-relaxed text-muted">{AVAILABILITY_TEXT[availability]}</p>
          {isModal && (
            <p className="pt-2 text-center">
              <Link
                href={`/productos/${product.slug}/`}
                className="text-xs font-semibold tracking-[0.16em] text-charcoal uppercase underline decoration-line underline-offset-8 transition-colors hover:decoration-charcoal"
              >
                Ver página del producto
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
