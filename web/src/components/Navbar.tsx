"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { List } from "@phosphor-icons/react/dist/ssr/List";
import { X } from "@phosphor-icons/react/dist/ssr/X";
import { NAV_LINKS } from "@/config/navigation";
import { site } from "@/config/site";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./icons";

const EASE_FLOW = [0.22, 1, 0.36, 1] as const;

interface NavbarProps {
  /** Coreografía de entrada (solo en la portada). */
  intro?: boolean;
}

/**
 * Navegación. Al hacer scroll se comprime levemente, toma un fondo marfil
 * translúcido y una sombra muy sutil; arriba recupera su estado inicial.
 */
export function Navbar({ intro = false }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const sheetRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") return close();
      if (event.key !== "Tab" || !sheetRef.current) return;
      const items = sheetRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const d = (ms: number) => (intro ? ({ "--d": `${ms}ms` } as React.CSSProperties) : undefined);

  return (
    <>
      <header className="site-nav fixed inset-x-0 top-0 z-(--z-nav)" data-scrolled={scrolled || undefined}>
        <div className="site-nav-inner frame flex h-(--nav-h) items-center justify-between gap-8">
          <Link
            href="/"
            className={`wordmark inline-flex min-h-11 items-center text-[1.0625rem] ${intro ? "in-rise" : ""}`}
            style={d(250)}
          >
            {site.name}
          </Link>

          <nav aria-label="Principal" className="hidden md:block">
            <ul className="flex items-center gap-9">
              {NAV_LINKS.map((link, i) => (
                <li key={link.href} className={intro ? "in-rise" : ""} style={d(340 + i * 60)}>
                  <Link href={link.href} className="nav-link inline-flex min-h-11 items-center">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <button
            ref={toggleRef}
            type="button"
            className={`-mr-3 inline-flex min-h-11 items-center gap-2 px-3 text-[0.875rem] font-medium md:hidden ${intro ? "in-rise" : ""}`}
            style={d(340)}
            aria-expanded={open}
            aria-controls="menu-movil"
            onClick={() => setOpen(true)}
          >
            Menú
            <List size={20} weight="light" aria-hidden="true" />
          </button>
        </div>
        <span className={`site-nav-rule ${intro ? "in-draw" : ""}`} style={d(100)} aria-hidden="true" />
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={sheetRef}
            id="menu-movil"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="fixed inset-0 z-(--z-sheet) flex flex-col bg-ivory pb-[max(1.5rem,env(safe-area-inset-bottom))] md:hidden"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-2%)" }}
            animate={{ opacity: 1, transform: "translateY(0%)" }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: EASE_FLOW }}
          >
            <div className="frame flex h-(--nav-h) items-center justify-between">
              <span className="wordmark text-[1.0625rem]">{site.name}</span>
              <button type="button" className="-mr-3 inline-flex min-h-11 items-center gap-2 px-3 text-[0.875rem] font-medium" onClick={close}>
                Cerrar
                <X size={20} weight="light" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Menú móvil" className="frame flex-1 pt-8">
              <ul>
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.href}
                    initial={reduce ? false : { opacity: 0, transform: "translateY(12px)" }}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    transition={{ duration: 0.5, delay: 0.08 + i * 0.05, ease: EASE_FLOW }}
                  >
                    <Link href={link.href} onClick={() => setOpen(false)} className="serif block py-3 text-[2.5rem] leading-tight">
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="frame">
              <a href={whatsappLink(GENERAL_MESSAGE)} target="_blank" rel="noopener noreferrer" className="btn btn-sage w-full">
                <WhatsAppIcon className="size-5" />
                Solicitar información
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
