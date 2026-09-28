"use client";

import { motion } from "framer-motion";
import type { Product } from "@/products/types";
import { getCategory } from "@/products/products";
import { priceLabel } from "@/lib/format";
import { Arrow } from "./motion";
import { ProductVisual } from "./ProductVisual";

interface ProductCardProps {
  product: Product;
  onOpen: (product: Product) => void;
}

export function ProductCard({ product, onOpen }: ProductCardProps) {
  const category = getCategory(product.category);
  const fragranceText =
    product.fragrances.length > 2 ? `${product.fragrances.length} aromas` : product.fragrances.map((f) => f.name).join(" · ");
  const presentationText = product.presentations.map((p) => p.label).join(" · ");

  return (
    <motion.article
      className="group relative flex h-full flex-col"
      whileHover={{ y: -6 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-[3px] transition-shadow duration-700 ease-[var(--ease-premium)] group-hover:shadow-[var(--shadow-soft)]"
        style={{ backgroundColor: product.visual.backdrop }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-[14%] bottom-[12%] top-[14%] rounded-t-full bg-white/35"
        />
        <div className="absolute inset-0 flex items-end justify-center pb-[10%]">
          <ProductVisual
            product={product}
            className={`relative transition-transform duration-[1200ms] ease-[var(--ease-premium)] group-hover:scale-[1.035] ${
              product.visual.shape === "pump" ? "h-[74%] w-auto" : "h-[70%] w-auto"
            }`}
          />
        </div>
        <span className="absolute left-5 top-5 text-[0.625rem] font-semibold tracking-[0.24em] text-muted uppercase">
          {category?.name}
        </span>
      </div>

      <div className="flex flex-1 flex-col pt-7">
        <h3 className="display text-[1.75rem] md:text-3xl">{product.name}</h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{product.shortDescription}</p>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
          <div>
            <dt className="eyebrow !text-[0.625rem]">{product.fragrances.length > 1 ? "Aromas" : "Aroma"}</dt>
            <dd className="mt-1.5 text-ink">{fragranceText}</dd>
          </div>
          <div>
            <dt className="eyebrow !text-[0.625rem]">
              {product.presentations.length > 1 ? "Presentaciones" : "Presentación"}
            </dt>
            <dd className="mt-1.5 text-ink">{presentationText}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-4 pt-7">
          <p className="font-serif text-xl text-charcoal">{priceLabel(product)}</p>
          <button
            type="button"
            onClick={() => onOpen(product)}
            className="inline-flex min-h-11 items-center gap-3 text-xs font-semibold tracking-[0.16em] text-charcoal uppercase after:absolute after:inset-0 after:content-['']"
            aria-label={`Ver producto: ${product.name}`}
          >
            <span className="relative">
              Ver producto
              <span className="absolute inset-x-0 -bottom-1 h-px origin-right scale-x-0 bg-charcoal transition-transform duration-500 ease-[var(--ease-premium)] group-hover:origin-left group-hover:scale-x-100" />
            </span>
            <Arrow className="w-5 transition-transform duration-500 ease-[var(--ease-premium)] group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
