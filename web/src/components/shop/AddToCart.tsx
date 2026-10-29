"use client";

import { useState } from "react";
import { money, toNumber } from "@/lib/shop/money";
import { useShop } from "./ShopProvider";
import { QuantityStepper } from "./QuantityStepper";

interface AddToCartProps {
  slug: string;
  sku: string;
  fragranceId: string | null;
  /** Se muestra cuando no se puede comprar en línea (tienda cerrada, sin precio, agotado). */
  fallback: React.ReactNode;
}

/**
 * Precio y compra de una presentación. El precio y la disponibilidad vienen
 * del servidor; si no hay tienda o la presentación no tiene precio, se muestra
 * `fallback` (la consulta por WhatsApp de siempre).
 */
export function AddToCart({ slug, sku, fragranceId, fallback }: AddToCartProps) {
  const { status, data, add, openDrawer, maxUnits, currency } = useShop();
  const [qty, setQty] = useState(1);

  if (status === "loading") return <div className="add-to-cart-skeleton" aria-hidden="true" />;
  const product = data?.products.find((p) => p.slug === slug);
  const variant = product?.variants.find((v) => v.sku === sku);
  const price = toNumber(variant?.price ?? null);
  const purchasable = status === "open" && variant?.available && Number.isFinite(price);
  if (!product || !variant || !purchasable) {
    return (
      <>
        {status === "open" && variant && !variant.available && Number.isFinite(price) ? (
          <p className="mb-4 text-small text-ink">Esta presentación está agotada por ahora.</p>
        ) : null}
        {fallback}
      </>
    );
  }
  const fragrance = product.fragrances.length ? product.fragrances.find((f) => f.id === fragranceId) ?? null : null;
  const max = Math.max(1, Math.min(variant.maxQuantity ?? 99, maxUnits));

  return (
    <div className="add-to-cart">
      <p className="serif text-title tabular" aria-live="polite">{money(price, currency)}</p>
      {data?.store.pricesIncludeTax ? <p className="text-small text-warm-gray">Impuestos incluidos · envío según tu zona</p> : null}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <QuantityStepper value={Math.min(qty, max)} max={max} onChange={setQty} label="Cantidad" />
        <button
          type="button"
          className="btn btn-solid grow sm:grow-0"
          disabled={product.fragrances.length > 0 && !fragrance}
          onClick={() => {
            add(variant.id, fragrance?.id ?? null, Math.min(qty, max));
            setQty(1);
            openDrawer();
          }}
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}
