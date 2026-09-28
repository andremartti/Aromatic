"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PRODUCTS } from "@/products/products";
import { EASE } from "./motion";
import { ProductDetail } from "./ProductDetail";

interface ProductModalProps {
  index: number | null;
  initialFragranceId?: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ProductModal({ index, initialFragranceId, onClose, onNavigate }: ProductModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState(1);
  const open = index !== null;
  const product = open ? PRODUCTS[index] : null;

  // Bloqueo de scroll, Escape y foco atrapado dentro del modal.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])'),
      ).filter((el) => el.offsetParent !== null || el.tagName === "INPUT");
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  const go = (step: number) => {
    if (index === null) return;
    setDirection(step);
    onNavigate((index + step + PRODUCTS.length) % PRODUCTS.length);
  };

  return (
    <AnimatePresence>
      {open && product && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6 lg:p-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-charcoal/35 backdrop-blur-sm"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-producto-titulo"
            className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-ivory md:h-[min(88vh,780px)] md:max-w-6xl md:rounded-[4px] md:shadow-[0_60px_120px_-40px_rgba(31,29,27,0.45)]"
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            {/* Controles */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 md:px-6 md:py-5">
              <div className="flex items-center gap-1 rounded-full bg-ivory/80 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-cream"
                  aria-label="Producto anterior"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </button>
                <span className="min-w-12 text-center text-[0.6875rem] font-semibold tracking-[0.2em] text-muted tabular-nums">
                  {String(index + 1).padStart(2, "0")} / {String(PRODUCTS.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-cream"
                  aria-label="Producto siguiente"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                data-autofocus
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory/80 text-charcoal backdrop-blur-md transition-transform duration-500 hover:rotate-90"
                aria-label="Cerrar detalle del producto"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </button>
            </div>

            <div className="relative flex-1 overflow-y-auto md:overflow-hidden">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={product.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="md:h-full"
                >
                  <ProductDetail
                    product={product}
                    initialFragranceId={initialFragranceId}
                    context="modal"
                    headingId="modal-producto-titulo"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
