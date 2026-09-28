"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { PRODUCTS } from "@/products/products";
import { ProductModal } from "./ProductModal";

interface OpenOptions {
  fragranceId?: string;
}

interface ModalState {
  index: number;
  fragranceId?: string;
}

interface ProductModalContextValue {
  openProduct: (productId: string, options?: OpenOptions) => void;
}

const ProductModalContext = createContext<ProductModalContextValue | null>(null);

/** Estado global del detalle de producto: cualquier sección puede abrirlo. */
export function ProductModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState | null>(null);

  const openProduct = useCallback((productId: string, options?: OpenOptions) => {
    const index = PRODUCTS.findIndex((p) => p.id === productId);
    if (index >= 0) setState({ index, fragranceId: options?.fragranceId });
  }, []);

  const close = useCallback(() => setState(null), []);
  const navigate = useCallback((index: number) => setState({ index }), []);
  const value = useMemo(() => ({ openProduct }), [openProduct]);

  return (
    <ProductModalContext.Provider value={value}>
      {children}
      <ProductModal
        index={state?.index ?? null}
        initialFragranceId={state?.fragranceId}
        onClose={close}
        onNavigate={navigate}
      />
    </ProductModalContext.Provider>
  );
}

export function useProductModal(): ProductModalContextValue {
  const ctx = useContext(ProductModalContext);
  if (!ctx) throw new Error("useProductModal debe usarse dentro de <ProductModalProvider>");
  return ctx;
}
