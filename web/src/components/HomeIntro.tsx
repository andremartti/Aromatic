"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { PRODUCTS } from "@/products/products";
import { site } from "@/config/site";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { ProductImage } from "./ProductImage";
import { CtaZone } from "./CtaZone";
import { ArrowIcon } from "./icons";

/** Orden en la composición: el detergente al centro, al frente. */
const LINEUP = ["suavizante", "detergente", "jabon-manos"] as const;
/** Profundidad de parallax por posición (px de desplazamiento máximo). */
const DEPTH = [22, 10, 26];
/** Entrada: el centro primero, luego los laterales; inclinación inicial. */
const ENTER = [
  { d: 520, r: -5 },
  { d: 340, r: 0 },
  { d: 640, r: 5 },
];
const LETTERS = site.name.split("");

/**
 * Página de inicio. AROMATIC se escribe letra por letra; los tres envases
 * suben desde el piso, se asientan y quedan flotando. En escritorio siguen al
 * ratón con profundidades distintas y, al bajar, se separan hacia el catálogo.
 */
export function HomeIntro() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 70, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 70, damping: 18, mass: 0.6 });

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const spread = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const markY = useTransform(scrollYProgress, [0, 1], ["0%", "-35%"]);
  const markOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const products = LINEUP.map((id) => PRODUCTS.find((p) => p.id === id)!).filter(Boolean);

  return (
    <section
      ref={ref}
      id="inicio"
      className="intro"
      aria-labelledby="inicio-title"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <motion.h1 id="inicio-title" className="intro-mark serif" style={reduce ? undefined : { y: markY, opacity: markOpacity }}>
        <span className="sr-only">{site.name}</span>
        <span aria-hidden="true">
          {LETTERS.map((l, i) => (
            <span key={i} className="intro-letter" style={{ "--i": i } as React.CSSProperties}>
              {l}
            </span>
          ))}
        </span>
      </motion.h1>

      <div className="intro-stage">
        {products.map((product, i) => (
          <IntroBottle
            key={product.id}
            index={i}
            product={product}
            sx={sx}
            sy={sy}
            spread={spread}
            reduce={!!reduce}
          />
        ))}
      </div>

      <div className="intro-foot frame">
        <p className="intro-tagline in-rise" style={{ "--d": "1300ms" } as React.CSSProperties}>
          {site.tagline}
        </p>
        <div className="intro-actions in-rise" style={{ "--d": "1450ms" } as React.CSSProperties}>
          <a href="#productos" className="btn btn-solid">
            Descubrir productos
            <ArrowIcon className="btn-arrow size-4" />
          </a>
          <CtaZone>
            <a href={whatsappLink(GENERAL_MESSAGE)} target="_blank" rel="noopener noreferrer" className="text-link">
              Solicitar información
            </a>
          </CtaZone>
        </div>
      </div>
    </section>
  );
}

function IntroBottle({
  index,
  product,
  sx,
  sy,
  spread,
  reduce,
}: {
  index: number;
  product: (typeof PRODUCTS)[number];
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  spread: MotionValue<number>;
  reduce: boolean;
}) {
  const side = index - 1; // -1 izquierda, 0 centro, 1 derecha
  const depth = DEPTH[index];
  const x = useTransform(() => sx.get() * depth * 2 + spread.get() * side * 90);
  const y = useTransform(() => sy.get() * depth + spread.get() * (side === 0 ? -30 : 20));
  const scale = useTransform(spread, [0, 1], [1, side === 0 ? 1.06 : 0.94]);

  return (
    <div
      className="intro-bottle in-bottle"
      data-side={side}
      style={
        {
          "--stature": product.stature,
          "--d": `${ENTER[index].d}ms`,
          "--r0": `${ENTER[index].r}deg`,
          "--fd": `${-index * 1.9}s`,
        } as React.CSSProperties
      }
    >
      <motion.div className="intro-bottle-parallax" style={reduce ? undefined : { x, y, scale }}>
        <Link href={`/productos/${product.slug}/`} className="intro-bottle-link" aria-label={`Ver ${product.name}`}>
          <span className="bottle-float">
            <ProductImage
              photo={product.image}
              alt=""
              sizes="(min-width: 1024px) 22vw, 34vw"
              priority
              className="intro-bottle-img"
            />
          </span>
          <span className="bottle-shadow" aria-hidden="true" />
          <span className="intro-bottle-label">{product.shortName}</span>
        </Link>
      </motion.div>
    </div>
  );
}
