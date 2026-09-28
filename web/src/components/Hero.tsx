"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { PRODUCTS } from "@/products/products";
import type { Product } from "@/products/types";
import { Button } from "./Button";
import { EASE, RevealText } from "./motion";
import { ProductVisual } from "./ProductVisual";

/** Composición del hero: [producto, clases de posición/tamaño, desfase de flotación]. */
const byId = (id: string) => PRODUCTS.find((p) => p.id === id) as Product;

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // Reacción al scroll: el texto se aleja y la composición avanza con parallax suave.
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const back = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const mid = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -90]);
  const front = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -150]);
  const halo = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.15]);

  const composition = [
    { product: byId("detergente"), y: back, className: "right-[3%] bottom-[14%] w-[36%] lg:right-[4%]", delay: 0.55, float: 7 },
    { product: byId("suavizante"), y: mid, className: "left-[20%] bottom-[9%] w-[47%] z-10", delay: 0.4, float: 6 },
    { product: byId("jabon-manos"), y: front, className: "left-[3%] bottom-[6%] w-[26%] z-20", delay: 0.7, float: 8 },
  ];

  return (
    <section
      ref={ref}
      id="inicio"
      className="relative flex min-h-[100svh] items-center overflow-hidden pb-16 pt-20 md:pt-32 lg:pb-0"
      aria-labelledby="hero-title"
    >
      {/* Fondo: luz cálida de estudio */}
      <div aria-hidden="true" className="grain pointer-events-none absolute inset-0 opacity-60" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[20%] top-[-10%] h-[80vh] w-[80vh] rounded-full bg-[radial-gradient(circle,rgba(217,196,166,0.35),transparent_65%)] lg:right-[-5%]"
      />

      <div className="container-x relative grid w-full items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
        <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 max-w-2xl">
          <motion.p
            className="wordmark mb-8 hidden text-sm text-charcoal/80 md:mb-10 lg:block"
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={{ opacity: 1, letterSpacing: "0.42em" }}
            transition={{ duration: 1.4, ease: EASE }}
          >
            AROMATIC
          </motion.p>
          <RevealText
            as="h1"
            immediate
            delay={0.25}
            text={"El cuidado que se siente.\nLa fragancia que permanece."}
            className="display text-[2.5rem] sm:text-6xl lg:text-[3rem] xl:text-[3.85rem] 2xl:text-[4.25rem]"
          />
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.05, ease: EASE }}
            className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-muted md:mt-8 md:text-[1.0625rem]"
          >
            Productos premium para transformar cada momento de limpieza en una experiencia de frescura, suavidad y
            aroma.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.25, ease: EASE }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 md:mt-10"
          >
            <Button href="/#productos" className="w-full sm:w-auto">
              Descubrir productos
            </Button>
            <Button href="/#marca" variant="outline" arrow={false} className="w-full sm:w-auto">
              Conocer AROMATIC
            </Button>
          </motion.div>
        </motion.div>

        {/* Composición de producto */}
        <div className="relative order-first mx-auto aspect-[1/0.78] w-full max-w-[34rem] sm:max-w-[38rem] lg:order-none lg:aspect-[1/1.05] lg:max-w-none">
          <motion.div
            aria-hidden="true"
            style={{ scale: halo }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, ease: EASE }}
            className="absolute inset-x-[8%] bottom-[4%] top-[6%] rounded-t-full bg-gradient-to-b from-cream via-linen/80 to-linen"
          />
          {/* Plataforma */}
          <div aria-hidden="true" className="absolute inset-x-[2%] bottom-[5%] h-px bg-gradient-to-r from-transparent via-sand/50 to-transparent" />
          <Bubbles />
          {composition.map(({ product, y, className, delay, float }) => (
            <motion.div key={product.id} style={{ y }} className={`absolute ${className}`}>
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.3, delay, ease: EASE }}
              >
                <motion.div
                  animate={reduce ? undefined : { y: [0, -float, 0] }}
                  transition={{ duration: 6 + float / 2, repeat: Infinity, ease: "easeInOut", delay: delay + 1.3 }}
                >
                  <ProductVisual product={product} className="h-auto w-full drop-shadow-[0_30px_30px_rgba(31,29,27,0.12)]" priority />
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
          <span className="sr-only">
            Composición con Aromatic Suavizante, Aromatic Detergente Líquido y Aromatic Jabón Líquido.
          </span>
        </div>
      </div>

      <motion.a
        href="#experiencia"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-[0.625rem] font-semibold tracking-[0.3em] text-muted uppercase lg:flex"
      >
        Desliza
        <span className="relative h-10 w-px overflow-hidden bg-line">
          <motion.span
            className="absolute inset-x-0 top-0 h-1/2 bg-charcoal/60"
            animate={reduce ? undefined : { y: ["-100%", "200%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.a>
    </section>
  );
}

/** Burbujas muy sutiles que ascienden detrás de los envases. */
function Bubbles() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const bubbles = [
    { left: "18%", size: 10, delay: 0, dur: 11 },
    { left: "36%", size: 6, delay: 3, dur: 9 },
    { left: "58%", size: 12, delay: 1.5, dur: 13 },
    { left: "74%", size: 7, delay: 5, dur: 10 },
    { left: "86%", size: 5, delay: 2.5, dur: 12 },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] bottom-[10%] top-[8%] overflow-hidden rounded-t-full">
      {bubbles.map((b, i) => (
        <motion.span
          key={i}
          className="absolute bottom-0 rounded-full border border-white/80 bg-white/40 shadow-[inset_-1px_-2px_3px_rgba(185,163,131,0.25)]"
          style={{ left: b.left, width: b.size, height: b.size }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, -420], opacity: [0, 0.9, 0] }}
          transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
