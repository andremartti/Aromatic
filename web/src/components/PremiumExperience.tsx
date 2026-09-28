"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { PRODUCTS } from "@/products/products";
import { Button } from "./Button";
import { ProductVisual } from "./ProductVisual";

const featured = PRODUCTS.find((p) => p.id === "jabon-manos") ?? PRODUCTS[0];

export function PremiumExperience() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });

  // La botella aparece lentamente mientras el texto entra desde un lateral.
  const bottleY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [140, 0]);
  const bottleOpacity = useTransform(scrollYProgress, [0.1, 0.8], [0, 1]);
  const bottleScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.92, 1]);
  const textX = useTransform(scrollYProgress, [0.2, 1], reduce ? [0, 0] : [90, 0]);
  const textOpacity = useTransform(scrollYProgress, [0.3, 1], [0, 1]);
  const arch = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.85, 1]);

  return (
    <section ref={ref} className="relative overflow-hidden py-24 md:py-36" aria-labelledby="premium-title">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[30rem]">
          <motion.div
            aria-hidden="true"
            style={{ scaleY: arch, transformOrigin: "bottom" }}
            className="absolute inset-0 rounded-t-full bg-gradient-to-b from-cream to-linen"
          />
          <div aria-hidden="true" className="absolute inset-x-[10%] bottom-[8%] h-px bg-gradient-to-r from-transparent via-sand/60 to-transparent" />
          <motion.div
            style={{ y: bottleY, opacity: bottleOpacity, scale: bottleScale }}
            className="absolute inset-0 flex items-end justify-center pb-[8%]"
          >
            <ProductVisual product={featured} className="h-[74%] w-auto" />
          </motion.div>
        </div>

        <motion.div style={{ x: textX, opacity: textOpacity }} className="max-w-lg">
          <p className="eyebrow">Hogar</p>
          <h2 id="premium-title" className="display mt-6 text-5xl md:text-6xl lg:text-7xl">
            Tu hogar también merece sentirse especial.
          </h2>
          <p className="mt-8 text-base leading-relaxed text-muted md:text-[1.0625rem]">
            Pequeños detalles que cambian la forma en que se siente tu casa: ropa suave, manos limpias y un aroma que
            permanece.
          </p>
          <Button href="/#productos" className="mt-10">
            Descubrir productos
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
