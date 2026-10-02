"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { List } from "@phosphor-icons/react/dist/ssr/List";
import { X } from "@phosphor-icons/react/dist/ssr/X";
import { NAV_LINKS } from "@/config/navigation";
import { site } from "@/config/site";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./icons";

interface NavbarProps {
  /**
   * "home": transparente sobre el mástil y con el wordmark oculto hasta que
   * el mástil sale de pantalla (animación ligada al scroll, solo CSS).
   * "page": papel sólido desde el inicio.
   */
  variant?: "home" | "page";
}

const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

export function Navbar({ variant = "page" }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

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
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusables = sheetRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
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

  return (
    <>
      <header className="site-nav fixed inset-x-0 top-0 z-(--z-nav)" data-variant={variant}>
        <div className="frame flex h-(--nav-h) items-center justify-between gap-6">
          <Link href="/" className="nav-wordmark wordmark inline-flex min-h-11 items-center text-[15px] text-charcoal" aria-label={`${site.name}, inicio`}>
            {site.name}
          </Link>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex flex-wrap items-center justify-end gap-x-9">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="nav-link field-label py-3 text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <button
            ref={toggleRef}
            type="button"
            className="field-label -mr-3 inline-flex min-h-11 items-center gap-2 px-3 text-charcoal lg:hidden"
            aria-expanded={open}
            aria-controls="menu-movil"
            onClick={() => setOpen(true)}
          >
            Menú
            <List size={20} weight="light" aria-hidden="true" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={sheetRef}
            id="menu-movil"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="fixed inset-0 z-(--z-sheet) flex flex-col bg-stock pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden"
            initial={reduce ? { opacity: 0 } : { transform: "translateY(-100%)" }}
            animate={reduce ? { opacity: 1 } : { transform: "translateY(0%)" }}
            exit={reduce ? { opacity: 0 } : { transform: "translateY(-100%)", transition: { duration: 0.28, ease: EASE_DRAWER } }}
            transition={{ duration: reduce ? 0.15 : 0.42, ease: EASE_DRAWER }}
          >
            <div className="frame flex h-(--nav-h) items-center justify-between">
              <span className="wordmark text-[15px] text-charcoal">{site.name}</span>
              <button
                type="button"
                className="field-label -mr-3 inline-flex min-h-11 items-center gap-2 px-3 text-charcoal"
                onClick={close}
              >
                Cerrar
                <X size={20} weight="light" aria-hidden="true" />
              </button>
            </div>
            <div className="frame double-rule text-rule-strong" aria-hidden="true" />
            <nav aria-label="Menú móvil" className="frame flex-1 pt-6">
              <ul>
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.href}
                    className="border-b border-rule"
                    initial={reduce ? false : { opacity: 0, transform: "translateY(10px)" }}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    transition={{ duration: 0.4, delay: reduce ? 0 : 0.12 + i * 0.045, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <Link href={link.href} onClick={() => setOpen(false)} className="display block py-4 text-[2.25rem] leading-tight">
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="frame">
              <a
                href={whatsappLink(GENERAL_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sage w-full"
              >
                <WhatsAppIcon className="size-5" />
                Comprar por WhatsApp
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
