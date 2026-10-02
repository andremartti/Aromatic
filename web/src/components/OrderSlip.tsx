"use client";

import { useId, useState } from "react";
import { PRODUCTS } from "@/products/products";
import { commerce } from "@/lib/commerce";
import { site } from "@/config/site";
import { CtaZone } from "./CtaZone";
import { WhatsAppIcon } from "./icons";

/**
 * Solicitud de información: producto, aroma y presentación con selects
 * nativos (cómodos en móvil, accesibles) y el mensaje de WhatsApp listo.
 */
export function OrderSlip() {
  const uid = useId();
  const [productId, setProductId] = useState(PRODUCTS[0]?.id ?? "");
  const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0];
  const [fragranceId, setFragranceId] = useState(product?.fragrances[0]?.id ?? "");
  const [presentationId, setPresentationId] = useState(product?.presentations[0]?.id ?? "");
  if (!product) return null;

  const fragrance = product.fragrances.find((f) => f.id === fragranceId) ?? product.fragrances[0];
  const presentation = product.presentations.find((p) => p.id === presentationId) ?? product.presentations[0];
  const href = commerce.checkoutUrl([{ product, fragrance, presentation, quantity: 1 }]);

  function changeProduct(id: string) {
    const next = PRODUCTS.find((p) => p.id === id);
    if (!next) return;
    setProductId(id);
    setFragranceId((c) => (next.fragrances.some((f) => f.id === c) ? c : next.fragrances[0].id));
    setPresentationId((c) => (next.presentations.some((p) => p.id === c) ? c : next.presentations[0].id));
  }

  return (
    <section id="contacto" className="contact bg-cream" aria-labelledby="contacto-title">
      <div className="frame contact-grid">
        <div>
          <h2 id="contacto-title" className="serif reveal-text text-heading">
            Solicitar información.
          </h2>
          <p className="reveal mt-6 max-w-[34ch] text-lede text-warm-gray">
            Elige producto, aroma y presentación, y escríbenos por WhatsApp. Vendemos en {site.city}.
          </p>
        </div>

        <form className="reveal contact-form" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-7 sm:grid-cols-3 sm:gap-6">
            <div className="field grid gap-2">
              <label htmlFor={`${uid}-p`} className="eyebrow">
                Producto
              </label>
              <select id={`${uid}-p`} value={product.id} onChange={(e) => changeProduct(e.target.value)}>
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field grid gap-2">
              <label htmlFor={`${uid}-a`} className="eyebrow">
                Aroma
              </label>
              <select
                id={`${uid}-a`}
                value={fragrance.id}
                onChange={(e) => setFragranceId(e.target.value)}
                disabled={product.fragrances.length < 2}
              >
                {product.fragrances.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field grid gap-2">
              <label htmlFor={`${uid}-r`} className="eyebrow">
                Presentación
              </label>
              <select
                id={`${uid}-r`}
                value={presentation.id}
                onChange={(e) => setPresentationId(e.target.value)}
                disabled={product.presentations.length < 2}
              >
                {product.presentations.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <CtaZone className="mt-9">
            <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-sage w-full sm:w-auto">
              <WhatsAppIcon className="size-5" />
              {commerce.ctaLabel}
            </a>
          </CtaZone>
          <p className="mt-4 text-small text-warm-gray">Abre WhatsApp con tu consulta ya escrita.</p>
        </form>
      </div>
    </section>
  );
}
