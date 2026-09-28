"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { commerce } from "@/lib/commerce";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { EASE } from "./motion";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

/** Botón flotante de compra por WhatsApp. Aparece tras dejar atrás el hero. */
export function WhatsAppButton() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setVisible(y > 520));

  return (
    <aside aria-label="Compra rápida">
    <AnimatePresence>
      {visible && (
        <motion.a
          href={whatsappLink(GENERAL_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={commerce.ctaLabel}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="group fixed bottom-5 right-5 z-40 flex h-14 items-center gap-3 rounded-full bg-charcoal pl-4 pr-4 text-ivory shadow-[0_20px_40px_-16px_rgba(31,29,27,0.5)] transition-colors duration-500 hover:bg-ink sm:bottom-8 sm:right-8 sm:pr-6"
        >
          <span className="relative flex h-7 w-7 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-sage/40 motion-safe:animate-[ping_3s_ease-out_infinite]" aria-hidden="true" />
            <WhatsAppIcon className="relative h-5 w-5" />
          </span>
          <span className="hidden text-xs font-semibold tracking-[0.12em] uppercase sm:inline">{commerce.ctaLabel}</span>
        </motion.a>
      )}
    </AnimatePresence>
    </aside>
  );
}
