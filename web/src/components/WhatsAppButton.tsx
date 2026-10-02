"use client";

import { useEffect, useState } from "react";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { WA_CTA_EVENT, type WaCtaDetail } from "./CtaZone";
import { WhatsAppIcon } from "./icons";

/**
 * Botón flotante de WhatsApp. Aparece al dejar atrás el hero (animación
 * ligada al scroll, solo CSS) y se retira mientras una zona que ya ofrece
 * comprar por WhatsApp (<CtaZone>) está en pantalla.
 * El número se configura con WHATSAPP_NUMBER (src/config/site.ts).
 */
export function WhatsAppButton() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const visible = new Set<symbol>();
    function onZone(event: Event) {
      const { id, visible: isVisible } = (event as CustomEvent<WaCtaDetail>).detail;
      if (isVisible) visible.add(id);
      else visible.delete(id);
      setMuted(visible.size > 0);
    }
    window.addEventListener(WA_CTA_EVENT, onZone);
    return () => window.removeEventListener(WA_CTA_EVENT, onZone);
  }, []);

  return (
    <div className="wa-float-wrap">
      <a
        href={whatsappLink(GENERAL_MESSAGE)}
        target="_blank"
        rel="noopener noreferrer"
        className="wa-float btn btn-sage"
        data-muted={muted || undefined}
        tabIndex={muted ? -1 : undefined}
        aria-hidden={muted || undefined}
      >
        <WhatsAppIcon className="size-6 shrink-0" />
        <span className="max-lg:sr-only">Comprar por WhatsApp</span>
      </a>
    </div>
  );
}
