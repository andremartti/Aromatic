"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { PRODUCTS, allFragrances } from "@/products/products";
import { site } from "@/config/site";
import { joinList } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { ArrowIcon } from "./icons";

const EASE_FLOW = [0.22, 1, 0.36, 1] as const;

const byId = (id: string) => PRODUCTS.find((p) => p.id === id)!;

/** Limpieza → Suavidad → Fragancia, con un primer plano de cada etiqueta. */
const CONCEPTS: { n: string; word: string; productId: string; text: () => string }[] = [
  {
    n: "01",
    word: "Limpieza",
    productId: "detergente",
    text: () => byId("detergente").summary,
  },
  {
    n: "02",
    word: "Suavidad",
    productId: "suavizante",
    text: () => byId("suavizante").summary,
  },
  {
    n: "03",
    word: "Fragancia",
    productId: "jabon-manos",
    text: () => {
      const floral = PRODUCTS.filter((p) => p.fragrances.length === 1).map((p) => p.shortName.toLowerCase());
      const many = PRODUCTS.find((p) => p.fragrances.length > 1);
      return `Floral en ${joinList(floral)}. ${many ? `${many.shortName}: ${joinList(allFragrances().map((f) => f.name))}.` : ""}`;
    },
  },
];

/**
 * "Más que limpieza." Narración ligada al scroll: el concepto activo toma
 * protagonismo y el primer plano pasa a la etiqueta del producto que lo cumple.
 */
export function ExperienceSection() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useTransform(scrollYProgress, [0.05, 0.95], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.max(0, Math.min(CONCEPTS.length - 1, Math.floor(v * CONCEPTS.length))));
  });

  const concept = CONCEPTS[active];
  const product = byId(concept.productId);

  return (
    <section ref={ref} id="experiencia" className="experience-track" aria-labelledby="experiencia-title">
      <div className="experience-sticky">
        <div className="frame experience-grid">
          <div className="experience-head">
            <h2 id="experiencia-title" className="serif reveal-text text-heading">
              Más que limpieza.
            </h2>
            <p className="reveal mt-5 max-w-[30ch] text-lede text-warm-gray">{site.tagline}</p>
          </div>

          <ol className="experience-words" aria-label="Conceptos">
            {CONCEPTS.map((c, i) => (
              <li key={c.n} className="flex items-baseline gap-4">
                <span className="tabular text-micro text-warm-gray">{c.n}</span>
                <span
                  className="concept-word serif"
                  data-active={i === active || undefined}
                  data-past={i < active || undefined}
                  aria-current={i === active ? "step" : undefined}
                >
                  {c.word}
                </span>
              </li>
            ))}
          </ol>

          <div className="experience-media">
            <div className="experience-stage">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={concept.n}
                  className="experience-zoom"
                  style={{ "--ratio": product.image.ratio } as React.CSSProperties}
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.45 } }}
                  transition={{ duration: 0.9, ease: EASE_FLOW }}
                >
                  <ProductImage
                    photo={product.image}
                    alt={`Etiqueta de ${product.name}`}
                    sizes="(min-width: 1024px) 42vw, 90vw"
                    className="experience-img"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="experience-progress" aria-hidden="true">
              <motion.span style={{ scaleY: progress }} />
            </div>
          </div>

          <div className="experience-text" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={concept.n}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                transition={{ duration: 0.55, ease: EASE_FLOW }}
              >
                <p className="max-w-[34ch] text-body text-ink">{concept.text()}</p>
                <Link href={`/productos/${product.slug}/`} className="text-link mt-4">
                  {product.name}
                  <ArrowIcon className="size-4" />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
