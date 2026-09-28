"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { EASE, Reveal, RevealText } from "./motion";

const PILLARS = [
  {
    title: "Funcionalidad",
    text: "Cada producto cumple una tarea concreta del hogar: lavar, suavizar la ropa y limpiar las manos.",
  },
  {
    title: "Cuidado",
    text: "Pensamos en lo que tocas todos los días: tus prendas y tu piel.",
  },
  {
    title: "Experiencia",
    text: "Una fragancia agradable convierte una rutina en un momento que se disfruta.",
  },
];

export function BrandSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["6%", "-10%"]);

  return (
    <section
      ref={ref}
      id="marca"
      className="relative overflow-hidden bg-charcoal py-28 text-ivory md:py-40"
      aria-labelledby="marca-title"
    >
      {/* Marca de agua con desplazamiento lateral sutil */}
      <motion.div aria-hidden="true" style={{ x }} className="pointer-events-none absolute left-0 top-10 w-[140vw] md:top-16">
        <svg viewBox="0 0 1400 200" className="h-auto w-full" focusable="false">
          <text
            x="0"
            y="165"
            fill="currentColor"
            className="text-ivory/[0.045]"
            fontFamily="var(--font-serif)"
            fontSize="200"
            fontWeight={500}
            letterSpacing="60"
          >
            AROMATIC
          </text>
        </svg>
      </motion.div>

      <div className="container-x relative">
        <Reveal>
          <p className="wordmark text-sm text-champagne">AROMATIC</p>
        </Reveal>
        <RevealText
          as="h2"
          id="marca-title"
          text="Una nueva forma de entender la limpieza."
          className="display mt-8 max-w-4xl text-5xl !text-ivory md:text-7xl"
        />
        <Reveal delay={0.15}>
          <p className="mt-10 max-w-xl text-base leading-relaxed text-ivory/70 md:text-[1.0625rem]">
            AROMATIC nace para unir tres cosas que rara vez van juntas en la limpieza del hogar: que funcione, que cuide
            y que se sienta bien.
          </p>
        </Reveal>

        <ol className="mt-20 grid gap-12 md:mt-28 md:grid-cols-3 md:gap-10">
          {PILLARS.map((p, i) => (
            <li key={p.title} className="relative pt-10">
              <motion.span
                aria-hidden="true"
                className="absolute left-0 top-0 h-px w-full origin-left bg-ivory/25"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 1.4, delay: i * 0.18, ease: EASE }}
              />
              <Reveal delay={0.2 + i * 0.12}>
                <span className="font-sans text-xs font-semibold tracking-[0.25em] text-champagne">0{i + 1}</span>
                <h3 className="mt-5 font-serif text-3xl text-ivory md:text-4xl">{p.title}</h3>
                <p className="mt-4 max-w-xs text-[0.9375rem] leading-relaxed text-ivory/65">{p.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
