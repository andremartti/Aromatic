"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "@/config/navigation";
import { commerce } from "@/lib/commerce";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { EASE } from "./motion";

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    // Se oculta al bajar y reaparece al subir, para dejar protagonismo al contenido.
    setHidden(y > 480 && y > prev && !open);
  });

  // Menú móvil: bloqueo de scroll, Escape para cerrar y foco dentro del panel.
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>("a,button");
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const toggle = toggleRef.current;
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      toggle?.focus();
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: hidden ? "-100%" : 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled && !open ? "border-b border-line/70 bg-ivory/80 backdrop-blur-xl" : "border-b border-transparent"
        }`}
      >
        <nav className="container-x flex h-18 items-center justify-between md:h-20" aria-label="Principal">
          <Link href="/" className="wordmark relative z-50 text-lg text-charcoal md:text-xl" aria-label="AROMATIC, inicio">
            AROMATIC
          </Link>

          <ul className="hidden items-center gap-10 lg:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="group relative py-2 text-[0.8125rem] font-medium tracking-[0.06em] text-ink/80 transition-colors hover:text-charcoal"
                >
                  {l.label}
                  <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-charcoal transition-transform duration-500 ease-[var(--ease-premium)] group-hover:scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <a
              href={whatsappLink(GENERAL_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full border border-charcoal/20 px-5 py-2.5 text-xs font-semibold tracking-[0.12em] text-charcoal uppercase transition-colors duration-500 hover:border-charcoal hover:bg-charcoal hover:text-ivory lg:inline-flex"
            >
              {commerce.ctaLabel.replace(" por WhatsApp", "")}
            </a>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="relative z-50 flex h-11 w-11 items-center justify-center lg:hidden"
              aria-expanded={open}
              aria-controls="menu-movil"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
            >
              <span className="relative block h-3 w-6">
                <motion.span
                  className="absolute left-0 top-0 h-px w-6 bg-charcoal"
                  animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                />
                <motion.span
                  className="absolute bottom-0 left-0 h-px bg-charcoal"
                  animate={open ? { rotate: -45, y: -5.5, width: 24 } : { rotate: 0, y: 0, width: 16 }}
                  transition={{ duration: 0.45, ease: EASE }}
                />
              </span>
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-movil"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="fixed inset-0 z-30 flex flex-col bg-ivory lg:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="container-x flex flex-1 flex-col justify-between pb-10 pt-28">
              <ul className="space-y-2">
                {NAV_LINKS.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 + i * 0.06, ease: EASE }}
                  >
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline gap-4 border-b border-line py-4 font-serif text-4xl text-charcoal"
                    >
                      <span className="font-sans text-[0.625rem] tracking-[0.2em] text-muted">0{i + 1}</span>
                      {l.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.6 }}
                className="space-y-6"
              >
                <a
                  href={whatsappLink(GENERAL_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-14 w-full items-center justify-center rounded-full bg-charcoal text-sm font-semibold tracking-[0.12em] text-ivory uppercase"
                >
                  {commerce.ctaLabel}
                </a>
                <p className="text-center text-xs tracking-[0.2em] text-muted uppercase">
                  El cuidado que se siente
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
