"use client";

import { useId, useState } from "react";
import { PRODUCTS } from "@/products/products";
import { commerce } from "@/lib/commerce";
import { site } from "@/config/site";
import { WhatsAppIcon } from "./icons";
import { CtaZone } from "./CtaZone";

/**
 * "Pide por WhatsApp": nota de pedido con forma de etiqueta.
 * Producto, aroma y presentación se eligen con selects nativos (cómodos en
 * móvil y accesibles) y el mensaje de WhatsApp se escribe solo.
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
    setFragranceId((current) => (next.fragrances.some((f) => f.id === current) ? current : next.fragrances[0].id));
    setPresentationId((current) =>
      next.presentations.some((p) => p.id === current) ? current : next.presentations[0].id,
    );
  }

  return (
    <section id="contacto" className="py-section" aria-labelledby="contacto-title">
      <div className="frame">
        <div className="mx-auto max-w-[40rem] text-center">
          <h2 id="contacto-title" className="display reveal-ink text-heading">
            Pide por WhatsApp.
          </h2>
          <p className="mx-auto mt-5 max-w-[38ch] text-lede text-muted">
            Vendemos en {site.city}. Elige el producto, el aroma y la presentación: el mensaje se escribe solo.
          </p>
        </div>

        <form className="order-slip label-stock reveal mx-auto mt-band" onSubmit={(e) => e.preventDefault()}>
          <div className="order-fields">
            <div className="order-field">
              <label htmlFor={`${uid}-producto`} className="field-label text-muted">
                Producto
              </label>
              <select id={`${uid}-producto`} value={product.id} onChange={(e) => changeProduct(e.target.value)}>
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortName}
                  </option>
                ))}
              </select>
            </div>
            <div className="order-field">
              <label htmlFor={`${uid}-aroma`} className="field-label text-muted">
                Aroma
              </label>
              <select
                id={`${uid}-aroma`}
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
            <div className="order-field">
              <label htmlFor={`${uid}-presentacion`} className="field-label text-muted">
                Presentación
              </label>
              <select
                id={`${uid}-presentacion`}
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
          <CtaZone className="mt-8">
            <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-sage w-full">
              <WhatsAppIcon className="size-5" />
              {commerce.ctaLabel}
            </a>
          </CtaZone>
          <p className="mt-4 text-center text-small text-muted">Abre WhatsApp con tu pedido ya escrito.</p>
        </form>
      </div>
    </section>
  );
}
