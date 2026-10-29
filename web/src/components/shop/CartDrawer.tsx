"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "@phosphor-icons/react/dist/ssr/X";
import { Bag } from "@phosphor-icons/react/dist/ssr/Bag";
import { money } from "@/lib/shop/money";
import { useShop } from "./ShopProvider";
import { ShopThumb } from "./ShopThumb";
import { QuantityStepper } from "./QuantityStepper";

const EASE_FLOW = [0.22, 1, 0.36, 1] as const;

/** Botón del carrito en la barra de navegación (solo con la tienda abierta). */
export function CartButton() {
  const { status, count, openDrawer } = useShop();
  if (status !== "open" && !(status === "closed" && count > 0)) return null;
  return (
    <button type="button" className="cart-button" onClick={openDrawer} aria-label={`Carrito: ${count} ${count === 1 ? "producto" : "productos"}`}>
      <Bag size={22} weight="light" aria-hidden="true" />
      {count > 0 ? <span className="cart-count tabular">{count > 99 ? "99+" : count}</span> : null}
    </button>
  );
}

/** Carrito lateral: cantidades, totales y paso al pago. */
export function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, subtotal, currency, setQuantity, remove, status, data } = useShop();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const hasInvalid = lines.some((l) => !l.available);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") return closeDrawer();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])");
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <AnimatePresence>
      {drawerOpen ? (
        <div className="cart-layer" role="presentation">
          <motion.div
            className="cart-scrim"
            onClick={closeDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="cart-panel"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: "0%" }}
            exit={reduce ? { opacity: 0 } : { x: "100%", transition: { duration: 0.3, ease: EASE_FLOW } }}
            transition={{ duration: 0.5, ease: EASE_FLOW }}
          >
            <div className="cart-head">
              <h2 id="cart-title" className="serif text-title">Tu carrito</h2>
              <button type="button" className="-mr-3 inline-flex min-h-11 items-center gap-2 px-3 text-[0.875rem] font-medium" onClick={closeDrawer}>
                Cerrar
                <X size={20} weight="light" aria-hidden="true" />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="cart-empty">
                <p className="text-lede text-warm-gray">Tu carrito está vacío.</p>
                <Link href="/tienda/" onClick={closeDrawer} className="btn btn-line mt-6">Ver productos</Link>
              </div>
            ) : (
              <>
                <ul className="cart-lines">
                  {lines.map((l) => (
                    <li key={l.key} className="cart-line" data-unavailable={!l.available || undefined}>
                      <ShopThumb slug={l.product?.slug} name={l.product?.name ?? "Producto"} fragranceId={l.fragranceId}
                        imageUrl={l.variant?.imageUrl ?? l.product?.imageUrl} sizes="72px" />
                      <div className="min-w-0">
                        <p className="text-body font-medium text-charcoal">{l.product?.shortName ?? "Producto no disponible"}</p>
                        <p className="text-small text-warm-gray">
                          {[l.variant?.presentation, l.fragrance?.name].filter(Boolean).join(" · ")}
                        </p>
                        {l.available ? (
                          <p className="mt-1 text-small tabular text-ink">{money(l.unitPrice, currency)}</p>
                        ) : (
                          <p className="mt-1 text-small text-alert">
                            {l.quantity > l.maxQuantity && l.variant?.available ? `Máximo ${l.maxQuantity} unidades` : "Ya no está disponible"}
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-4">
                          {l.variant ? (
                            <QuantityStepper value={l.quantity} max={Math.max(l.maxQuantity, 1)} onChange={(q) => setQuantity(l.key, q)}
                              label={`Cantidad de ${l.product?.shortName ?? "producto"}`} />
                          ) : null}
                          <button type="button" className="text-small text-warm-gray underline underline-offset-4 min-h-11" onClick={() => remove(l.key)}>
                            Quitar
                          </button>
                        </div>
                      </div>
                      <p className="cart-line-total tabular">{l.available ? money(l.lineTotal, currency) : "—"}</p>
                    </li>
                  ))}
                </ul>
                <div className="cart-foot">
                  <div className="flex items-baseline justify-between">
                    <span className="eyebrow">Subtotal</span>
                    <span className="serif text-title tabular">{money(subtotal, currency)}</span>
                  </div>
                  <p className="mt-2 text-small text-warm-gray">
                    El envío se calcula con tu dirección.{data?.store.pricesIncludeTax ? " Precios con impuestos incluidos." : ""}
                  </p>
                  {status !== "open" ? (
                    <p className="mt-4 text-small text-ink">La tienda en línea no está recibiendo pedidos en este momento.</p>
                  ) : hasInvalid ? (
                    <p className="mt-4 text-small text-ink">Quita o ajusta los productos marcados para continuar.</p>
                  ) : null}
                  {status === "open" && !hasInvalid ? (
                    <Link href="/checkout/" onClick={closeDrawer} className="btn btn-solid mt-6 w-full">Continuar al pago</Link>
                  ) : (
                    <button type="button" disabled className="btn btn-solid mt-6 w-full opacity-50">Continuar al pago</button>
                  )}
                  <button type="button" onClick={closeDrawer} className="text-link mx-auto mt-3 flex">Seguir comprando</button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
