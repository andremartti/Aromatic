"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { ProductModalProvider } from "./ProductModalProvider";

/** Respeta "reducir movimiento" del sistema operativo en todas las animaciones. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ProductModalProvider>{children}</ProductModalProvider>
    </MotionConfig>
  );
}
