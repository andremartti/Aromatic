"use client";

import { useRef, useState } from "react";
import { PRODUCTS } from "@/products/products";
import { ProductCard } from "./ProductCard";
import { Reveal, RevealText } from "./motion";
import { useProductModal } from "./ProductModalProvider";

export function ProductShowcase() {
  const { openProduct } = useProductModal();
  const rowRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  // Indicador del carrusel móvil.
  const onScroll = () => {
    const row = rowRef.current;
    if (!row) return;
    const card = row.children[0] as HTMLElement | undefined;
    if (!card) return;
    setActive(Math.round(row.scrollLeft / (card.offsetWidth + 16)));
  };

  const goTo = (i: number) => {
    const row = rowRef.current;
    const card = row?.children[i] as HTMLElement | undefined;
    if (row && card) row.scrollTo({ left: card.offsetLeft - row.offsetLeft, behavior: "smooth" });
  };

  return (
    <section id="productos" className="relative bg-cream/50 py-28 md:py-40" aria-labelledby="productos-title">
      <div className="container-x">
        <div className="mb-14 flex flex-col justify-between gap-8 md:mb-20 md:flex-row md:items-end">
          <div>
            <Reveal>
              <p className="eyebrow mb-6">Colección</p>
            </Reveal>
            <RevealText as="h2" id="productos-title" text="Descubre AROMATIC" className="display text-5xl md:text-7xl" />
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-[0.9375rem] leading-relaxed text-muted">
              Cuidado para la ropa y para tus manos, con fragancias que acompañan cada momento.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Móvil: carrusel deslizable · Escritorio: cuadrícula */}
      <ul
        ref={rowRef}
        onScroll={onScroll}
        className="snap-row flex gap-4 overflow-x-auto px-6 pb-4 md:mx-auto md:grid md:max-w-[84rem] md:px-10 xl:px-16 md:grid-cols-2 md:gap-x-8 md:gap-y-20 md:overflow-visible lg:grid-cols-3 lg:gap-x-10"
        aria-label="Productos AROMATIC"
      >
        {PRODUCTS.map((product, i) => (
          <Reveal
            as="li"
            key={product.id}
            delay={i * 0.12}
            className="w-[82%] shrink-0 snap-center sm:w-[60%] md:w-auto"
          >
            <ProductCard product={product} onOpen={(p) => openProduct(p.id)} />
          </Reveal>
        ))}
      </ul>

      <div className="mt-8 flex justify-center gap-2 md:hidden" role="tablist" aria-label="Navegar productos">
        {PRODUCTS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-label={p.name}
            onClick={() => goTo(i)}
            className="flex h-11 w-8 items-center justify-center"
          >
            <span
              className={`block h-px transition-all duration-500 ${active === i ? "w-8 bg-charcoal" : "w-4 bg-charcoal/25"}`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
