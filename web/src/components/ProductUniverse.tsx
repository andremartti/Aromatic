"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { PRODUCTS } from "@/products/products";
import type { Product } from "@/products/types";
import { infoMessage, whatsappLink } from "@/lib/whatsapp";
import { ProductImage } from "./ProductImage";
import { CtaZone } from "./CtaZone";
import { ArrowIcon } from "./icons";

const EASE_FLOW = [0.22, 1, 0.36, 1] as const;

const copyVariants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25, ease: EASE_FLOW } },
};
const lineVariants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_FLOW } },
};
const ruleVariants = {
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { duration: 0.7, ease: [0.77, 0, 0.175, 1] as const } },
};

/** El envase entra desde el lado hacia el que se avanza y sale por el opuesto. */
const bottleVariants = {
  enter: (dir: number) => ({ opacity: 0, x: `${dir * 38}%`, rotate: dir * 7, scale: 0.88, filter: "blur(6px)" }),
  center: { opacity: 1, x: "0%", rotate: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } },
  exit: (dir: number) => ({ opacity: 0, x: `${dir * -38}%`, rotate: dir * -7, scale: 0.88, filter: "blur(6px)" }),
};
const wordVariants = {
  enter: (dir: number) => ({ opacity: 0, x: `${dir * 8}%` }),
  center: { opacity: 1, x: "0%" },
  exit: (dir: number) => ({ opacity: 0, x: `${dir * -8}%` }),
};

/**
 * Catálogo interactivo. El producto elegido ocupa el centro, flota y se
 * inclina con el ratón; los otros dos asoman a los lados y son botones. Al
 * cambiar, el envase sale de lado y el nuevo entra desde el opuesto. La palabra
 * gigante va detrás del envase y su contorno por delante, así se lee completa.
 */
export function ProductUniverse() {
  const initial = PRODUCTS.find((p) => p.featured) ?? PRODUCTS[0];
  const [state, setState] = useState({ id: initial.id, dir: 1 });
  const reduce = useReducedMotion();
  const swipeX = useRef<number | null>(null);

  const index = PRODUCTS.findIndex((p) => p.id === state.id);
  const selected = PRODUCTS[index];
  const prev = PRODUCTS[(index - 1 + PRODUCTS.length) % PRODUCTS.length];
  const next = PRODUCTS[(index + 1) % PRODUCTS.length];

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 110, damping: 16 });
  const rotateY = useSpring(ry, { stiffness: 110, damping: 16 });

  const select = useCallback(
    (id: string, dir?: number) => {
      if (id === state.id) return;
      const to = PRODUCTS.findIndex((p) => p.id === id);
      setState({ id, dir: dir ?? (to > index ? 1 : -1) });
    },
    [state.id, index],
  );
  const step = useCallback((dir: 1 | -1) => select((dir === 1 ? next : prev).id, dir), [select, next, prev]);

  return (
    <section id="productos" className="universe" aria-label="Productos AROMATIC">
      <div className="frame universe-grid">
        <div
          className="universe-stage"
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse") swipeX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (swipeX.current === null) return;
            const dx = e.clientX - swipeX.current;
            swipeX.current = null;
            if (Math.abs(dx) > 44) step(dx < 0 ? 1 : -1);
          }}
          onPointerMove={(e) => {
            if (reduce || e.pointerType !== "mouse") return;
            const r = e.currentTarget.getBoundingClientRect();
            ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
            rx.set(-((e.clientY - r.top) / r.height - 0.5) * 6);
          }}
          onPointerLeave={() => {
            rx.set(0);
            ry.set(0);
          }}
        >
          <span className="universe-glow" aria-hidden="true" />

          {/* Palabra gigante: relleno detrás del envase */}
          <Word product={selected} dir={state.dir} className="universe-word universe-word-back" />

          {/* Laterales: los otros productos, como botones */}
          <Lateral product={prev} side="left" onSelect={() => step(-1)} />
          <Lateral product={next} side="right" onSelect={() => step(1)} />

          {/* Producto protagonista */}
          <div className="universe-bottle-track">
            <AnimatePresence mode="popLayout" initial={false} custom={state.dir}>
              <motion.div
                key={selected.id}
                className="universe-bottle"
                style={{ "--stature": selected.stature } as React.CSSProperties}
                custom={state.dir}
                variants={reduce ? undefined : bottleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.75, ease: EASE_FLOW }}
              >
                <motion.div
                  className="universe-bottle-tilt"
                  style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 1100 }}
                >
                  <span className="bottle-float">
                    <ProductImage
                      photo={selected.image}
                      alt={selected.name}
                      sizes="(min-width: 1024px) 26vw, 46vw"
                      priority={selected.id === initial.id}
                      className="universe-bottle-img"
                    />
                  </span>
                </motion.div>
                <span className="bottle-shadow" aria-hidden="true" />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Contorno de la palabra por delante: se lee aunque el envase la cruce */}
          <Word product={selected} dir={state.dir} className="universe-word universe-word-front" />
        </div>

        {/* Selector de producto */}
        <nav aria-label="Seleccionar producto" className="universe-selector">
          <p className="eyebrow">Productos</p>
          <ul className="mt-3">
            {PRODUCTS.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="selector-item"
                  aria-pressed={p.id === selected.id}
                  onClick={() => select(p.id)}
                >
                  <span className="tabular text-micro">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-[0.9375rem] font-medium">{p.shortName}</span>
                    <span className="selector-rule" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Ficha del producto protagonista */}
        <div className="universe-info" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={selected.id} variants={copyVariants} initial="hidden" animate="shown" exit="exit">
              <motion.p variants={lineVariants} className="eyebrow">
                {selected.use}
              </motion.p>
              <motion.h2 variants={lineVariants} className="serif mt-3 text-title">
                <span className="sr-only">AROMATIC </span>
                {selected.shortName}
              </motion.h2>
              <motion.span
                variants={ruleVariants}
                className="hairline mt-5 block w-16 text-gold"
                style={{ transformOrigin: "left" }}
                aria-hidden="true"
              />
              <motion.p variants={lineVariants} className="mt-5 max-w-[36ch] text-body text-warm-gray">
                {selected.summary}
              </motion.p>
              <motion.div variants={lineVariants} className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3">
                <Link href={`/productos/${selected.slug}/`} className="btn btn-solid">
                  Conocer producto
                  <ArrowIcon className="btn-arrow size-4" />
                </Link>
                <CtaZone>
                  <a href={whatsappLink(infoMessage(selected.name))} target="_blank" rel="noopener noreferrer" className="text-link">
                    Solicitar información
                  </a>
                </CtaZone>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Word({ product, dir, className }: { product: Product; dir: number; className: string }) {
  return (
    <div className={`${className} serif`} aria-hidden="true">
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={product.id}
          className="inline-block"
          custom={dir}
          variants={wordVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.7, ease: EASE_FLOW }}
        >
          {product.heroWord}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function Lateral({ product, side, onSelect }: { product: Product; side: "left" | "right"; onSelect: () => void }) {
  return (
    <button
      type="button"
      className="universe-lateral"
      data-side={side}
      style={{ "--stature": product.stature } as React.CSSProperties}
      onClick={onSelect}
      aria-label={`Ver ${product.name}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={product.id}
          className="universe-lateral-inner"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          transition={{ duration: 0.6, ease: EASE_FLOW }}
        >
          <ProductImage photo={product.image} alt="" sizes="(min-width: 1024px) 12vw, 22vw" className="universe-lateral-img" />
        </motion.span>
      </AnimatePresence>
      <span className="universe-lateral-label">{product.shortName}</span>
    </button>
  );
}
