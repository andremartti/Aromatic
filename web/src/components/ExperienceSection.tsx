"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE, Reveal, RevealText } from "./motion";

const CONCEPTS = [
  {
    n: "01",
    title: "Limpieza",
    text: "Fórmulas para la ropa y para las manos, pensadas para el día a día.",
    Visual: CleanVisual,
  },
  {
    n: "02",
    title: "Suavidad",
    text: "Prendas con sensación de suavidad y manos que se sienten cuidadas.",
    Visual: SoftVisual,
  },
  {
    n: "03",
    title: "Fragancia",
    text: "Aromas agradables que acompañan cada tarea y permanecen.",
    Visual: ScentVisual,
  },
];

export function ExperienceSection() {
  return (
    <section id="experiencia" className="relative py-28 md:py-40" aria-labelledby="experiencia-title">
      <div className="container-x">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
          <div>
            <Reveal>
              <p className="eyebrow mb-6">La experiencia AROMATIC</p>
            </Reveal>
            <RevealText as="h2" id="experiencia-title" text="Más que limpieza." className="display text-5xl md:text-7xl" />
          </div>
          <Reveal delay={0.15} className="lg:pt-16">
            <p className="max-w-lg font-serif text-2xl leading-snug text-ink md:text-[1.9rem]">
              AROMATIC combina limpieza, suavidad y fragancias agradables para convertir las tareas cotidianas en una
              experiencia diferente.
            </p>
          </Reveal>
        </div>

        <ol className="mt-20 grid gap-px overflow-hidden rounded-[2px] bg-line md:mt-28 md:grid-cols-3">
          {CONCEPTS.map(({ n, title, text, Visual }, i) => (
            <Reveal as="li" key={n} delay={i * 0.12} className="group flex flex-col bg-ivory">
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-cream/60 transition-colors duration-700 group-hover:bg-cream">
                <Visual />
              </div>
              <div className="flex flex-1 flex-col gap-4 px-2 pb-10 pt-8 md:px-8">
                <span className="font-sans text-xs font-semibold tracking-[0.25em] text-bronze">{n}</span>
                <h3 className="display text-3xl md:text-4xl">{title}</h3>
                <p className="max-w-xs text-[0.9375rem] leading-relaxed text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Composiciones visuales minimalistas (SVG animado)
 * ------------------------------------------------------------------------- */

function CleanVisual() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 200 150" className="h-3/5 w-auto" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.ellipse
          key={i}
          cx="100"
          cy="118"
          fill="none"
          stroke="#b9a383"
          strokeWidth="0.8"
          initial={{ rx: 10, ry: 3, opacity: 0 }}
          animate={reduce ? { rx: 30 + i * 20, ry: 6 + i * 3, opacity: 0.4 } : { rx: [10, 70], ry: [3, 14], opacity: [0.7, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: i * 1.2, ease: "easeOut" }}
        />
      ))}
      <motion.path
        d="M100 28 C100 28 76 62 76 80 C76 94 87 104 100 104 C113 104 124 94 124 80 C124 62 100 28 100 28 Z"
        fill="#faf7f2"
        stroke="#1f1d1b"
        strokeWidth="0.9"
        animate={reduce ? undefined : { y: [0, 4, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <path d="M90 82 C90 90 95 95 101 96" fill="none" stroke="#b9a383" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

function SoftVisual() {
  const reduce = useReducedMotion();
  const waves = [
    "M20 60 C60 40 90 80 130 60 S180 40 190 55",
    "M20 78 C60 58 90 98 130 78 S180 58 190 73",
    "M20 96 C60 76 90 116 130 96 S180 76 190 91",
  ];
  return (
    <svg viewBox="0 0 210 150" className="h-3/5 w-auto" aria-hidden="true">
      {waves.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke={i === 1 ? "#1f1d1b" : "#b9a383"}
          strokeWidth={i === 1 ? 0.9 : 0.8}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          animate={reduce ? undefined : { x: [0, i % 2 ? -6 : 6, 0] }}
          transition={{
            pathLength: { duration: 1.8, delay: i * 0.2, ease: EASE },
            opacity: { duration: 0.6, delay: i * 0.2 },
            x: { duration: 7, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}
    </svg>
  );
}

function ScentVisual() {
  const reduce = useReducedMotion();
  const trails = ["M84 120 C70 96 100 80 86 56 C76 40 90 28 96 20", "M104 120 C92 98 120 84 108 60 C100 44 112 32 118 24", "M124 120 C114 102 136 90 128 70"];
  return (
    <svg viewBox="0 0 200 150" className="h-3/5 w-auto" aria-hidden="true">
      <ellipse cx="104" cy="126" rx="34" ry="5" fill="none" stroke="#1f1d1b" strokeWidth="0.9" />
      {trails.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke={i === 1 ? "#1f1d1b" : "#b9a383"}
          strokeWidth="0.9"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}
