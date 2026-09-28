"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useState } from "react";
import { PRODUCTS } from "@/products/products";
import { EASE, Reveal, RevealText } from "./motion";
import { useProductModal } from "./ProductModalProvider";

/** Orden de pestañas: primero el producto con más aromas. */
const TABS = [...PRODUCTS].sort((a, b) => b.fragrances.length - a.fragrances.length);

export function FragranceSection() {
  const { openProduct } = useProductModal();
  const [productId, setProductId] = useState(TABS[0].id);
  const product = TABS.find((p) => p.id === productId) ?? TABS[0];
  const [fragranceId, setFragranceId] = useState(product.fragrances[0].id);
  const fragrance = product.fragrances.find((f) => f.id === fragranceId) ?? product.fragrances[0];

  const selectProduct = (id: string) => {
    const next = TABS.find((p) => p.id === id)!;
    setProductId(id);
    setFragranceId(next.fragrances[0].id);
  };

  return (
    <section id="aromas" className="relative overflow-hidden py-28 md:py-40" aria-labelledby="aromas-title">
      <div className="container-x">
        <div className="text-center">
          <Reveal>
            <p className="eyebrow mb-6">Fragancias</p>
          </Reveal>
          <RevealText as="h2" id="aromas-title" text="Encuentra tu aroma." className="display text-5xl md:text-7xl" />
        </div>

        {/* Selector de producto */}
        <Reveal delay={0.1} className="mt-12 flex justify-center md:mt-16">
          <LayoutGroup id="tabs-aromas">
            <div role="tablist" aria-label="Producto" className="flex max-w-full gap-0.5 rounded-full border border-line bg-ivory p-1">
              {TABS.map((p) => {
                const active = p.id === productId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    id={`tab-${p.id}`}
                    aria-selected={active}
                    aria-controls="panel-aromas"
                    onClick={() => selectProduct(p.id)}
                    className={`relative min-h-11 shrink-0 rounded-full px-3.5 text-[0.625rem] font-semibold tracking-[0.06em] uppercase transition-colors duration-500 sm:px-5 sm:text-xs sm:tracking-[0.1em] md:px-7 ${
                      active ? "text-ivory" : "text-muted hover:text-charcoal"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-full bg-charcoal"
                        transition={{ duration: 0.5, ease: EASE }}
                      />
                    )}
                    <span className="relative whitespace-nowrap">{p.shortName}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </Reveal>

        <div
          id="panel-aromas"
          role="tabpanel"
          aria-labelledby={`tab-${product.id}`}
          className="mt-16 grid items-center gap-14 md:mt-24 lg:grid-cols-[1fr_1.15fr] lg:gap-24"
        >
          {/* Aroma destacado */}
          <div className="relative mx-auto flex aspect-square w-full max-w-[26rem] items-center justify-center">
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-line"
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            >
              <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sand" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${product.id}-${fragrance.id}`}
                initial={{ opacity: 0, scale: 0.88, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.06, filter: "blur(8px)" }}
                transition={{ duration: 0.7, ease: EASE }}
                className="relative flex h-[72%] w-[72%] flex-col items-center justify-center rounded-full text-center"
                style={{
                  background: `radial-gradient(circle at 32% 28%, #ffffff 0%, ${fragrance.swatch} 58%, ${fragrance.swatch} 100%)`,
                  boxShadow: "inset -18px -24px 60px rgba(185,163,131,0.25), 0 40px 80px -40px rgba(31,29,27,0.25)",
                }}
              >
                <span className="eyebrow">Aroma</span>
                <span className="display mt-3 px-6 text-4xl md:text-5xl" aria-live="polite">
                  {fragrance.name}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Lista de aromas */}
          <div>
            <p className="eyebrow">{product.name}</p>
            <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted">
              {product.fragrances.length > 1
                ? `Disponible en ${product.fragrances.length} aromas. Elige el tuyo.`
                : `Disponible en aroma ${product.fragrances[0].name}.`}
            </p>

            <fieldset className="mt-10">
              <legend className="sr-only">Aromas de {product.name}</legend>
              <motion.ul
                key={product.id}
                className="grid grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-6"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              >
                {product.fragrances.map((f) => {
                  const selected = f.id === fragrance.id;
                  return (
                    <motion.li
                      key={f.id}
                      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                    >
                      <label className="group flex cursor-pointer flex-col items-center gap-4 text-center">
                        <input
                          type="radio"
                          name="aroma-destacado"
                          value={f.id}
                          checked={selected}
                          onChange={() => setFragranceId(f.id)}
                          className="peer sr-only"
                        />
                        <span className="relative flex h-20 w-20 items-center justify-center rounded-full peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-charcoal md:h-24 md:w-24">
                          {selected && (
                            <motion.span
                              layoutId={`ring-${product.id}`}
                              className="absolute -inset-2 rounded-full border border-charcoal/70"
                              transition={{ duration: 0.5, ease: EASE }}
                            />
                          )}
                          <motion.span
                            className="h-full w-full rounded-full ring-1 ring-charcoal/5"
                            style={{ background: `radial-gradient(circle at 32% 28%, #fff 0%, ${f.swatch} 65%)` }}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.96 }}
                            animate={{ scale: selected ? 1.04 : 1 }}
                            transition={{ duration: 0.5, ease: EASE }}
                          />
                        </span>
                        <span
                          className={`text-[0.8125rem] tracking-[0.04em] transition-colors duration-300 ${
                            selected ? "font-semibold text-charcoal" : "text-muted group-hover:text-charcoal"
                          }`}
                        >
                          {f.name}
                        </span>
                      </label>
                    </motion.li>
                  );
                })}
              </motion.ul>
            </fieldset>

            <div className="mt-12">
              <button
                type="button"
                onClick={() => openProduct(product.id, { fragranceId: fragrance.id })}
                className="group inline-flex min-h-12 items-center gap-3 rounded-full border border-charcoal/25 px-7 text-[0.8125rem] font-semibold tracking-[0.08em] text-charcoal uppercase transition-colors duration-500 hover:border-charcoal hover:bg-charcoal hover:text-ivory"
              >
                Elegir {product.shortName.toLowerCase()} · {fragrance.name}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
