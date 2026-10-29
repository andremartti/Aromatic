"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { ShopProvider } from "./shop/ShopProvider";
import { CartDrawer } from "./shop/CartDrawer";

/**
 * Proveedores globales: "reducir movimiento" del sistema operativo en Motion y
 * el estado de la tienda (catálogo con precios del servidor y carrito).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ShopProvider>
        {children}
        <CartDrawer />
      </ShopProvider>
    </MotionConfig>
  );
}
