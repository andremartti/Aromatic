"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { PRODUCTS } from "@/products/products";
import type { Product } from "@/products/types";
import type { Shot } from "@/config/scene";
import { joinList } from "@/lib/format";
import { infoMessage, whatsappLink } from "@/lib/whatsapp";
import { SceneStage } from "./SceneStage";
import { CtaZone } from "./CtaZone";
import { ArrowIcon } from "./icons";

const EASE_FLOW = [0.22, 1, 0.36, 1] as const;

const copyVariants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
  exit: { opacity: 0, scale: 0.97, y: -10, transition: { duration: 0.28, ease: EASE_FLOW } },
};
const lineVariants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_FLOW } },
};
const ruleVariants = {
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { duration: 0.7, ease: [0.77, 0, 0.175, 1] as const } },
};

function byId(id: string): Product {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
}

/** Encuadre con un leve desplazamiento hacia el producto en previsualización. */
function cameraFor(focus: Product, preview: Product | null): Shot {
  const shot = focus.scene.shot;
  if (!preview || preview.id === focus.id) return shot;
  const p = preview.scene.shot;
  return { cx: shot.cx + (p.cx - shot.cx) * 0.07, cy: shot.cy, z: shot.z * 0.99 };
}

/**
 * Universo de producto: el hero (selección) y el descubrimiento comparten la
 * misma escena fotográfica. En escritorio la escena queda fija mientras se
 * hace scroll: se desplaza a la derecha y la cámara enfoca el producto de cada
 * capítulo. En móvil, cada capítulo trae su propio encuadre.
 */
export function ProductUniverse() {
  const initial = PRODUCTS.find((p) => p.featured) ?? PRODUCTS[0];
  const [selectedId, setSelectedId] = useState(initial.id);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [switched, setSwitched] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const chaptersRef = useRef<HTMLDivElement>(null);
  const swipeX = useRef<number | null>(null);

  const focus = byId(chapterId ?? selectedId);
  const selected = byId(selectedId);
  const preview = previewId ? byId(previewId) : null;

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const u = useTransform(scrollYProgress, [0, 0.2], [0, 1], { clamp: true });

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setPreviewId(null);
    setSwitched(true);
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      const i = PRODUCTS.findIndex((p) => p.id === selectedId);
      select(PRODUCTS[(i + dir + PRODUCTS.length) % PRODUCTS.length].id);
    },
    [selectedId, select],
  );

  // El capítulo que cruza el centro de la pantalla toma el foco de la escena.
  useEffect(() => {
    const root = chaptersRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const chapters = root.querySelectorAll<HTMLElement>("[data-chapter]");
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set((e.target as HTMLElement).dataset.chapter!, e.isIntersecting);
        const current = [...chapters].map((c) => c.dataset.chapter!).find((id) => visible.get(id));
        if (current) setChapterId(current);
        else if (root.getBoundingClientRect().top > window.innerHeight * 0.5) setChapterId(null);
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    chapters.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="productos" className="universe" aria-label="Productos AROMATIC">

      <motion.div className="universe-sticky" style={{ "--u": u } as unknown as React.CSSProperties}>
        <div
          className="universe-stage-wrap"
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse") swipeX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (swipeX.current === null) return;
            const dx = e.clientX - swipeX.current;
            swipeX.current = null;
            if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
          }}
        >
          <SceneStage
            products={PRODUCTS}
            focusId={focus.id}
            previewId={previewId}
            shot={cameraFor(focus, preview)}
            layer="back"
            className="universe-stage universe-stage-mask"
            backEnterClass={switched ? "" : "in-settle"}
            priority
          />

          <div className="universe-word serif" aria-hidden="true">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={focus.id}
                className={`inline-block ${switched ? "" : "in-reveal"}`}
                style={switched ? undefined : ({ "--d": "700ms" } as React.CSSProperties)}
                initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                exit={{ opacity: 0, scale: 0.96, filter: "blur(8px)", transition: { duration: 0.35, ease: EASE_FLOW } }}
                transition={{ duration: 0.7, ease: EASE_FLOW }}
              >
                {focus.heroWord}
              </motion.span>
            </AnimatePresence>
          </div>

          <SceneStage
            products={PRODUCTS}
            focusId={focus.id}
            previewId={previewId}
            shot={cameraFor(focus, preview)}
            layer="front"
            selectable={chapterId === null}
            onSelect={select}
            onPreview={setPreviewId}
            className="universe-stage universe-stage-mask universe-front"
            frontEnterClass={switched ? "" : "in-focus"}
            priority
          />
        </div>

        <div className="universe-copy">
          <div className="frame universe-copy-grid">
            {/* Selector de producto */}
            <nav aria-label="Seleccionar producto" className="universe-selector">
              <p
                className={`eyebrow ${switched ? "" : "in-rise"}`}
                style={switched ? undefined : ({ "--d": "600ms" } as React.CSSProperties)}
              >
                Productos
              </p>
              <ul className="mt-3">
                {PRODUCTS.map((p, i) => (
                  <li
                    key={p.id}
                    className={switched ? "" : "in-rise"}
                    style={switched ? undefined : ({ "--d": `${760 + i * 70}ms` } as React.CSSProperties)}
                  >
                    <button
                      type="button"
                      className="selector-item"
                      aria-pressed={p.id === selected.id}
                      onClick={() => select(p.id)}
                    >
                      <span className="tabular text-micro">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="block text-[0.9375rem] font-medium">{p.name.replace("AROMATIC ", "")}</span>
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
                  <motion.p
                    variants={lineVariants}
                    className={`eyebrow ${switched ? "" : "in-reveal"}`}
                    style={switched ? undefined : ({ "--d": "620ms" } as React.CSSProperties)}
                  >
                    {selected.use}
                  </motion.p>
                  <motion.h1
                    variants={lineVariants}
                    className={`serif mt-3 text-title ${switched ? "" : "in-reveal"}`}
                    style={switched ? undefined : ({ "--d": "740ms" } as React.CSSProperties)}
                  >
                    <span className="sr-only">AROMATIC </span>
                    {selected.shortName}
                  </motion.h1>
                  <motion.span
                    variants={ruleVariants}
                    className={`hairline mt-5 block w-16 text-gold ${switched ? "" : "in-draw"}`}
                    style={{ transformOrigin: "left", ...(switched ? {} : ({ "--d": "900ms" } as React.CSSProperties)) }}
                    aria-hidden="true"
                  />
                  <motion.p
                    variants={lineVariants}
                    className={`mt-5 max-w-[36ch] text-body text-warm-gray ${switched ? "" : "in-rise"}`}
                    style={switched ? undefined : ({ "--d": "1000ms" } as React.CSSProperties)}
                  >
                    {selected.summary}
                  </motion.p>
                  <motion.div
                    variants={lineVariants}
                    className={`mt-7 flex flex-wrap items-center gap-x-7 gap-y-2 ${switched ? "" : "in-rise"}`}
                    style={switched ? undefined : ({ "--d": "1250ms" } as React.CSSProperties)}
                  >
                    <Link href={`/productos/${selected.slug}/`} className="btn btn-solid">
                      Conocer producto
                      <ArrowIcon className="btn-arrow size-4" />
                    </Link>
                    <CtaZone>
                      <a
                        href={whatsappLink(infoMessage(selected.name))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link"
                      >
                        Solicitar información
                      </a>
                    </CtaZone>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            <a
              href="#descubrir"
              className={`scroll-cue universe-cue ${switched ? "" : "in-fade"}`}
              style={switched ? undefined : ({ "--d": "1600ms" } as React.CSSProperties)}
            >
              <span>Descubrir</span>
              <span className="scroll-cue-line" aria-hidden="true" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* Descubrimiento: un capítulo por producto */}
      <div ref={chaptersRef} id="descubrir" className="universe-chapters">
        <div className="frame">
          <div className="chapter-intro chapter-copy reveal">
            <h2 className="serif max-w-[14ch] text-heading">Descubre AROMATIC.</h2>
            <p className="mt-5 max-w-[30ch] text-lede text-warm-gray">Limpieza, suavidad y fragancia en tres productos para el hogar.</p>
          </div>
        </div>
        {PRODUCTS.map((product, i) => (
          <article key={product.id} className="chapter" data-chapter={product.id} aria-labelledby={`chapter-${product.id}`}>
            <div className="frame">
              <div className="chapter-copy">
                <SceneStage
                  products={PRODUCTS}
                  focusId={product.id}
                  shot={product.scene.shot}
                  className="chapter-stage lg:hidden"
                  sizes="760px"
                />
                <p className="eyebrow reveal mt-8 lg:mt-0">
                  <span className="tabular">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mx-3 inline-block h-px w-6 translate-y-[-0.3em] bg-gold align-middle" aria-hidden="true" />
                  {product.use}
                </p>
                <h3 id={`chapter-${product.id}`} className="serif reveal-text mt-5 text-heading">
                  <span className="sr-only">AROMATIC </span>
                  {product.shortName}
                </h3>
                <p className="reveal mt-6 max-w-[38ch] text-lede text-warm-gray">{product.summary}</p>
                <span className="hairline reveal-line mt-8 block w-full max-w-[26rem] text-line" aria-hidden="true" />
                <dl className="reveal mt-6 grid max-w-[26rem] grid-cols-2 gap-6">
                  <div>
                    <dt className="eyebrow">{product.fragrances.length > 1 ? "Aromas" : "Aroma"}</dt>
                    <dd className="mt-2 text-body text-charcoal">{joinList(product.fragrances.map((f) => f.name))}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">{product.presentations.length > 1 ? "Presentaciones" : "Presentación"}</dt>
                    <dd className="mt-2 text-body text-charcoal">{joinList(product.presentations.map((p) => p.label))}</dd>
                  </div>
                </dl>
                <div className="reveal mt-9">
                  <Link href={`/productos/${product.slug}/`} className="btn btn-line">
                    Conocer producto
                    <ArrowIcon className="btn-arrow size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
