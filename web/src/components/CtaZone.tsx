"use client";

import { useEffect, useRef, type ReactNode } from "react";

export const WA_CTA_EVENT = "aromatic:wa-cta";

export interface WaCtaDetail {
  id: symbol;
  visible: boolean;
}

/**
 * Marca una zona que ya ofrece comprar por WhatsApp. Mientras está en
 * pantalla, el botón flotante se retira para no duplicar la acción.
 */
export function CtaZone({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const id = Symbol("wa-cta");
    const emit = (visible: boolean) =>
      window.dispatchEvent(new CustomEvent<WaCtaDetail>(WA_CTA_EVENT, { detail: { id, visible } }));
    const observer = new IntersectionObserver(([entry]) => emit(entry.isIntersecting));
    observer.observe(el);
    return () => {
      observer.disconnect();
      emit(false);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
