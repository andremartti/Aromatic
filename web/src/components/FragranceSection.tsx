"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PRODUCTS, allFragrances, productsWithFragrance } from "@/products/products";
import { joinList } from "@/lib/format";
import { fragranceMessage, whatsappLink } from "@/lib/whatsapp";
import { asset } from "@/lib/asset";
import { CtaZone } from "./CtaZone";
import { ArrowIcon, WhatsAppIcon } from "./icons";

const EASE_FLOW = [0.22, 1, 0.36, 1] as const;

/** Partículas de la atmósfera: posiciones fijas (sin aleatoriedad en el render). */
const DOTS = [
  { x: 12, y: 22, s: 90, b: 18, o: 0.55, t: 17, dx: 30, dy: -20 },
  { x: 78, y: 18, s: 140, b: 28, o: 0.45, t: 21, dx: -26, dy: 24 },
  { x: 64, y: 72, s: 70, b: 14, o: 0.6, t: 15, dx: 18, dy: -34 },
  { x: 30, y: 80, s: 120, b: 24, o: 0.4, t: 19, dx: -22, dy: -18 },
  { x: 48, y: 38, s: 36, b: 8, o: 0.55, t: 13, dx: 14, dy: 22 },
  { x: 88, y: 56, s: 48, b: 10, o: 0.5, t: 16, dx: -16, dy: -26 },
  { x: 20, y: 52, s: 26, b: 6, o: 0.6, t: 12, dx: 20, dy: 16 },
  { x: 58, y: 12, s: 22, b: 5, o: 0.55, t: 14, dx: -12, dy: 18 },
];

interface Layer {
  key: number;
  tint: string;
  x: number;
  y: number;
}

/**
 * "Encuentra tu aroma." Atmósfera abstracta: luz, desenfoque y partículas en
 * el tono del aroma, sin ilustraciones literales. Al cambiar de aroma, la
 * nueva atmósfera se expande desde la opción elegida y el jabón líquido
 * aparece con el color de líquido de esa variante (la etiqueta es la original).
 */
export function FragranceSection() {
  const fragrances = allFragrances();
  const jabon = PRODUCTS.find((p) => p.cutouts);
  const [selectedId, setSelectedId] = useState("floral");
  const selected = fragrances.find((f) => f.id === selectedId) ?? fragrances[0];
  const [layers, setLayers] = useState<Layer[]>([{ key: 0, tint: selected.tint, x: 50, y: 50 }]);
  const sectionRef = useRef<HTMLElement>(null);
  const products = productsWithFragrance(selected.id);
  const image = jabon?.cutouts?.[selected.id];

  function choose(id: string, el: HTMLElement) {
    if (id === selectedId) return;
    const f = fragrances.find((x) => x.id === id);
    const box = sectionRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = box ? ((r.left + r.width * 0.3 - box.left) / box.width) * 100 : 50;
    const y = box ? ((r.top + r.height / 2 - box.top) / box.height) * 100 : 50;
    setSelectedId(id);
    if (f) setLayers((prev) => [...prev.slice(-1), { key: (prev.at(-1)?.key ?? 0) + 1, tint: f.tint, x, y }]);
  }

  return (
    <section
      ref={sectionRef}
      id="aromas"
      className="aromas relative overflow-hidden"
      aria-labelledby="aromas-title"
      style={{ "--tint": selected.tint } as React.CSSProperties}
    >
      <div className="atmos" aria-hidden="true">
        {layers.map((layer, i) => (
          <motion.div
            key={layer.key}
            className="atmos-layer"
            style={{ "--tint": layer.tint } as React.CSSProperties}
            initial={i === 0 && layer.key === 0 ? false : { clipPath: `circle(0% at ${layer.x}% ${layer.y}%)` }}
            animate={{ clipPath: `circle(150% at ${layer.x}% ${layer.y}%)` }}
            transition={{ duration: 1.1, ease: EASE_FLOW }}
          />
        ))}
        {DOTS.map((d, i) => (
          <span
            key={i}
            className="atmos-dot"
            style={
              {
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: d.s,
                height: d.s,
                "--b": `${d.b}px`,
                "--o": d.o,
                "--t": `${d.t}s`,
                "--dx": `${d.dx}px`,
                "--dy": `${d.dy}px`,
                "--dl": `${-i * 1.7}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="frame aromas-grid relative">
        <div className="aromas-intro">
          <h2 id="aromas-title" className="serif reveal-text text-heading">
            Encuentra tu aroma.
          </h2>
          <p className="reveal mt-5 max-w-[32ch] text-body text-warm-gray">
            Seis aromas para el jabón líquido. Suavizante y detergente líquido, en Floral.
          </p>

          <fieldset className="mt-8">
            <legend className="sr-only">Elige un aroma</legend>
            {fragrances.map((f) => {
              const count = productsWithFragrance(f.id).length;
              const isSelected = f.id === selected.id;
              return (
                <label key={f.id} className="aroma-option cursor-pointer" data-selected={isSelected || undefined}>
                  <input
                    type="radio"
                    name="aroma-home"
                    value={f.id}
                    checked={isSelected}
                    onChange={(e) => choose(f.id, e.currentTarget.parentElement as HTMLElement)}
                    className="sr-only"
                  />
                  <span className="serif text-[1.625rem] leading-tight">{f.name}</span>
                  <span className="text-micro tabular">{count === 1 ? "1 producto" : `${count} productos`}</span>
                </label>
              );
            })}
          </fieldset>
        </div>

        <div className="aromas-visual" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            {image ? (
              <motion.div
                key={selected.id}
                className="aromas-bottle"
                initial={{ opacity: 0, scale: 0.96, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10, transition: { duration: 0.35, ease: EASE_FLOW } }}
                transition={{ duration: 0.7, ease: EASE_FLOW }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset(image)}
                  alt={`${jabon?.name}, aroma ${selected.name}`}
                  className="product-cutout aromas-float h-full w-auto"
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <span className="aromas-floor" aria-hidden="true" />
        </div>

        <div className="aromas-detail">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: EASE_FLOW }}
            >
              <p className="eyebrow">Aroma</p>
              <p className="serif mt-2 text-title">{selected.name}</p>
              <span className="hairline mt-5 block w-12 text-gold" aria-hidden="true" />
              <p className="eyebrow mt-6">Disponible en</p>
              <ul className="mt-2">
                {products.map((p) => (
                  <li key={p.id} className="border-b border-[color-mix(in_srgb,var(--color-charcoal)_12%,transparent)]">
                    <Link href={`/productos/${p.slug}/?aroma=${selected.id}`} className="group flex min-h-14 items-center justify-between gap-4 py-2">
                      <span>
                        <span className="block text-body text-charcoal">{p.name}</span>
                        <span className="block text-small text-warm-gray">{joinList(p.presentations.map((x) => x.label))}</span>
                      </span>
                      <ArrowIcon className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
          <CtaZone className="mt-7">
            <a
              href={whatsappLink(fragranceMessage(selected.name, joinList(products.map((p) => p.name))))}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sage w-full"
            >
              <WhatsAppIcon className="size-5" />
              Consultar producto
            </a>
          </CtaZone>
        </div>
      </div>
    </section>
  );
}
