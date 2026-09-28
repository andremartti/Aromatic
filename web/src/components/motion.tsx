"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ElementType, ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Desplazamiento inicial en píxeles. */
  y?: number;
  x?: number;
  as?: "div" | "section" | "li" | "article" | "p" | "span";
}

/** Fade-in suave al entrar en pantalla (una sola vez). */
export function Reveal({ children, className, delay = 0, y = 28, x = 0, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: reduce ? 0.3 : 0.9, delay, ease: EASE }}
    >
      {children}
    </Comp>
  );
}

const wordVariants: Variants = {
  hidden: { opacity: 0, y: "0.6em" },
  show: { opacity: 1, y: "0em", transition: { duration: 0.8, ease: EASE } },
};

interface RevealTextProps {
  text: string;
  id?: string;
  className?: string;
  as?: ElementType;
  delay?: number;
  /** Anima al montar (hero) en lugar de al entrar en pantalla. */
  immediate?: boolean;
}

/**
 * Texto que aparece palabra por palabra. Admite "\n" para forzar saltos de línea.
 * El texto completo queda disponible para lectores de pantalla.
 */
export function RevealText({ text, id, className, as: Tag = "p", delay = 0, immediate = false }: RevealTextProps) {
  const reduce = useReducedMotion();
  const lines = text.split("\n");
  const trigger = immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true, margin: "0px 0px -10% 0px" } };
  return (
    <Tag id={id} className={className}>
      <span className="sr-only">{text.replace(/\n/g, " ")}</span>
      <motion.span
        aria-hidden="true"
        className="block"
        initial={reduce ? false : "hidden"}
        {...trigger}
        transition={{ staggerChildren: 0.055, delayChildren: delay }}
      >
        {lines.map((line, li) => (
          <span key={li} className="block [text-wrap:balance]">
            {line.split(" ").map((word, wi) => (
              <span key={wi} className="inline-block overflow-hidden -mt-[0.18em] pb-[0.1em] pt-[0.18em] align-bottom">
                <motion.span className="inline-block" variants={reduce ? undefined : wordVariants}>
                  {word}
                  {wi < line.split(" ").length - 1 ? " " : ""}
                </motion.span>
              </span>
            ))}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/** Flecha fina usada en botones y enlaces. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" className={className} fill="none" aria-hidden="true">
      <path d="M0 6h22M17 1l5 5-5 5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
