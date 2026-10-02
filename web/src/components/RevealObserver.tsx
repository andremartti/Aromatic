"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Revela una sola vez los elementos .reveal / .reveal-ink al entrar en
 * pantalla. Un único IntersectionObserver para toda la página.
 *
 * El contenido es visible por defecto: solo se oculta antes de revelarse si
 * el script inicial marcó <html data-js> y el usuario no pidió reducir el
 * movimiento (ver globals.css). Sin JavaScript, todo se ve estático.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".reveal:not(.is-revealed), .reveal-ink:not(.is-revealed)");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("is-revealed"));
      return;
    }
    // .reveal-ink oculta su texto con clip-path, y IntersectionObserver mide la
    // caja ya recortada (área cero): se observa su contenedor en su lugar.
    const targets = new Map<Element, HTMLElement[]>();
    elements.forEach((el) => {
      const target = el.classList.contains("reveal-ink") ? (el.parentElement ?? el) : el;
      targets.set(target, [...(targets.get(target) ?? []), el]);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          targets.get(entry.target)?.forEach((el) => el.classList.add("is-revealed"));
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );
    targets.forEach((_, target) => observer.observe(target));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
