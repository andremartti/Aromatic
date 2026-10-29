"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { PRODUCTS } from "@/products/products";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { money, toNumber } from "@/lib/shop/money";
import type { StoreProduct } from "@/lib/shop/api";
import { useShop } from "./ShopProvider";
import { ShopThumb } from "./ShopThumb";
import { QuantityStepper } from "./QuantityStepper";
import { TestModeBanner } from "./TestModeBanner";
import { ArrowIcon, WhatsAppIcon } from "../icons";

/** Listado de la tienda: todos los productos activos del panel, con precio y compra. */
export function ShopView() {
  const { status, data } = useShop();

  return (
    <div className="frame pb-section pt-[calc(var(--nav-h)+2.5rem)]">
      <TestModeBanner />
      <header className="max-w-[44rem]">
        <h1 className="serif text-heading">Tienda</h1>
        <p className="mt-5 text-lede text-warm-gray">
          Elige presentación y aroma, y recibe tus productos AROMATIC en casa.
        </p>
      </header>

      {status === "off" || status === "error" || (status === "closed" && !data?.products.length) ? (
        <div className="shop-notice mt-12">
          <p className="text-lede text-ink">
            {status === "error"
              ? "No pudimos cargar la tienda en este momento."
              : "La tienda en línea todavía no está recibiendo pedidos."}
          </p>
          <p className="mt-2 text-body text-warm-gray">Puedes consultar productos y aromas por WhatsApp.</p>
          <a href={whatsappLink(GENERAL_MESSAGE)} target="_blank" rel="noopener noreferrer" className="btn btn-sage mt-6">
            <WhatsAppIcon className="size-5" />
            Solicitar información
          </a>
        </div>
      ) : status === "loading" ? (
        <ul className="shop-grid mt-12" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="shop-card shop-card-skeleton" aria-hidden="true" />
          ))}
        </ul>
      ) : (
        <>
          {status === "closed" ? (
            <p className="shop-notice mt-10 text-body text-ink">
              La tienda en línea no está recibiendo pedidos en este momento. Los precios son informativos.
            </p>
          ) : null}
          <ul className="shop-grid mt-12">
            {data?.products.map((p) => <ProductBuyCard key={p.id} product={p} canBuy={status === "open"} />)}
          </ul>
        </>
      )}
    </div>
  );
}

function ProductBuyCard({ product, canBuy }: { product: StoreProduct; canBuy: boolean }) {
  const uid = useId();
  const { add, openDrawer, currency, maxUnits } = useShop();
  const [variantId, setVariantId] = useState(product.variants.find((v) => v.available)?.id ?? product.variants[0]?.id ?? "");
  const [fragranceId, setFragranceId] = useState(product.fragrances[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId);
  const price = toNumber(variant?.price ?? null);
  const hasPrice = Number.isFinite(price);
  const isStatic = PRODUCTS.some((s) => s.slug === product.slug);
  const max = Math.max(1, Math.min(variant?.maxQuantity ?? 99, maxUnits));
  const buyable = canBuy && variant?.available && hasPrice;

  return (
    <li className="shop-card">
      <div className="shop-card-visual">
        <ShopThumb slug={product.slug} name={product.name} fragranceId={fragranceId} imageUrl={variant?.imageUrl ?? product.imageUrl}
          sizes="(min-width: 1024px) 18vw, 40vw" alt={product.name} />
      </div>
      <div className="shop-card-body">
        {product.use ? <p className="eyebrow">{product.use}</p> : null}
        <h2 className="serif mt-2 text-title">
          <span className="sr-only">AROMATIC </span>
          {product.shortName}
        </h2>
        {product.summary ? <p className="mt-3 text-small text-warm-gray">{product.summary}</p> : null}

        {product.variants.length > 1 ? (
          <fieldset className="mt-5">
            <legend className="eyebrow">Presentación</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <label key={v.id} className="chip" data-selected={v.id === variantId || undefined}>
                  <input type="radio" className="sr-only" name={`${uid}-v`} checked={v.id === variantId} onChange={() => setVariantId(v.id)} />
                  {v.presentation}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="mt-5 text-small text-ink">Presentación: {variant?.presentation}</p>
        )}

        {product.fragrances.length > 1 ? (
          <div className="field mt-5 grid gap-2">
            <label htmlFor={`${uid}-f`} className="eyebrow">Aroma</label>
            <select id={`${uid}-f`} value={fragranceId ?? ""} onChange={(e) => setFragranceId(e.target.value)}>
              {product.fragrances.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        ) : product.fragrances.length === 1 ? (
          <p className="mt-2 text-small text-ink">Aroma: {product.fragrances[0].name}</p>
        ) : null}

        <p className="serif mt-6 text-title tabular">{hasPrice ? money(price, currency) : "Precio por confirmar"}</p>
        {hasPrice && variant && !variant.available ? <p className="text-small text-ink">Agotado por ahora</p> : null}

        {buyable ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <QuantityStepper value={Math.min(qty, max)} max={max} onChange={setQty} label={`Cantidad de ${product.shortName}`} />
            <button
              type="button"
              className="btn btn-solid grow"
              onClick={() => {
                add(variant!.id, fragranceId, Math.min(qty, max));
                setQty(1);
                openDrawer();
              }}
            >
              Agregar al carrito
            </button>
          </div>
        ) : null}
        {isStatic ? (
          <Link href={`/productos/${product.slug}/`} className="text-link mt-4">
            Conocer producto
            <ArrowIcon className="size-4" />
          </Link>
        ) : null}
      </div>
    </li>
  );
}
