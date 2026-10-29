"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { shopConfigured } from "@/config/shop";
import { shopApi, type StoreData, type StoreProduct, type StoreVariant } from "@/lib/shop/api";
import { toNumber } from "@/lib/shop/money";

export type ShopStatus = "off" | "loading" | "open" | "closed" | "error";

export interface CartLine {
  variantId: string;
  fragranceId: string | null;
  quantity: number;
}

export interface ResolvedLine extends CartLine {
  key: string;
  product: StoreProduct | null;
  variant: StoreVariant | null;
  fragrance: { id: string; name: string } | null;
  unitPrice: number;
  lineTotal: number;
  /** false si la presentación ya no existe, no tiene precio o se agotó. */
  available: boolean;
  maxQuantity: number;
}

interface ShopContextValue {
  status: ShopStatus;
  data: StoreData | null;
  lines: ResolvedLine[];
  count: number;
  subtotal: number;
  currency: string;
  maxUnits: number;
  add: (variantId: string, fragranceId: string | null, quantity: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  reload: () => void;
}

const STORAGE_KEY = "aromatic-cart-v1";
const ShopContext = createContext<ShopContextValue | null>(null);

const lineKey = (l: CartLine) => `${l.variantId}:${l.fragranceId ?? ""}`;

function readCart(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((l) => typeof l?.variantId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0)
      .slice(0, 50)
      .map((l) => ({ variantId: l.variantId, fragranceId: typeof l.fragranceId === "string" ? l.fragranceId : null, quantity: Math.min(l.quantity, 99) }));
  } catch {
    return [];
  }
}

/*
 * El carrito vive en localStorage y se lee con useSyncExternalStore: en el
 * servidor (y al hidratar) está vacío, en el cliente toma lo guardado, y se
 * sincroniza entre pestañas con el evento "storage".
 */
const EMPTY_CART: CartLine[] = [];
const cartListeners = new Set<() => void>();
let cartCache: CartLine[] | null = null;

function cartSnapshot(): CartLine[] {
  cartCache ??= readCart();
  return cartCache;
}

function subscribeCart(listener: () => void) {
  cartListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cartCache = readCart();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    cartListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeCart(lines: CartLine[]) {
  cartCache = lines;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* almacenamiento no disponible: el carrito vive solo en esta pestaña */
  }
  for (const l of cartListeners) l();
}

/** Busca una presentación en el catálogo del servidor. */
export function findVariant(data: StoreData | null, variantId: string) {
  for (const product of data?.products ?? []) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ShopStatus>(shopConfigured ? "loading" : "off");
  const [data, setData] = useState<StoreData | null>(null);
  const cart = useSyncExternalStore(subscribeCart, cartSnapshot, () => EMPTY_CART);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  // El panel no usa el catálogo público ni el carrito.
  const inAdmin = usePathname()?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (!shopConfigured || inAdmin) return;
    let alive = true;
    shopApi
      .store()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus(d.store.enabled ? "open" : "closed");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [nonce, inAdmin]);

  const update = useCallback((fn: (prev: CartLine[]) => CartLine[]) => writeCart(fn(cartSnapshot())), []);

  const maxUnits = data?.store.maxUnitsPerOrder ?? 30;

  const lines = useMemo<ResolvedLine[]>(() => {
    return cart.map((l) => {
      const found = findVariant(data, l.variantId);
      const product = found?.product ?? null;
      const variant = found?.variant ?? null;
      const fragrance = product?.fragrances.find((f) => f.id === l.fragranceId) ?? null;
      const fragranceOk = product ? (product.fragrances.length === 0 ? l.fragranceId === null : fragrance !== null) : false;
      const unitPrice = toNumber(variant?.price ?? null);
      const maxQuantity = Math.min(variant?.maxQuantity ?? 99, maxUnits);
      const available = Boolean(variant?.available) && fragranceOk && Number.isFinite(unitPrice) && l.quantity <= maxQuantity;
      return {
        ...l,
        key: lineKey(l),
        product,
        variant,
        fragrance,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        lineTotal: Number.isFinite(unitPrice) ? unitPrice * l.quantity : 0,
        available,
        maxQuantity,
      };
    });
  }, [cart, data, maxUnits]);

  const value = useMemo<ShopContextValue>(() => {
    const valid = lines.filter((l) => l.available);
    return {
      status,
      data,
      lines,
      count: cart.reduce((n, l) => n + l.quantity, 0),
      subtotal: valid.reduce((s, l) => s + l.lineTotal, 0),
      currency: data?.store.currency ?? "HNL",
      maxUnits,
      add: (variantId, fragranceId, quantity) =>
        update((prev) => {
          const key = lineKey({ variantId, fragranceId, quantity });
          const existing = prev.find((l) => lineKey(l) === key);
          if (existing) {
            return prev.map((l) => (lineKey(l) === key ? { ...l, quantity: Math.min(l.quantity + quantity, 99) } : l));
          }
          return [...prev, { variantId, fragranceId, quantity: Math.min(quantity, 99) }].slice(0, 50);
        }),
      setQuantity: (key, quantity) =>
        update((prev) => prev.map((l) => (lineKey(l) === key ? { ...l, quantity: Math.max(1, Math.min(quantity, 99)) } : l))),
      remove: (key) => update((prev) => prev.filter((l) => lineKey(l) !== key)),
      clear: () => update(() => []),
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      reload: () => setNonce((n) => n + 1),
    };
  }, [status, data, lines, cart, maxUnits, drawerOpen, update]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop debe usarse dentro de ShopProvider");
  return ctx;
}
