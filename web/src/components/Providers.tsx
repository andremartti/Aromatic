"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Respeta "reducir movimiento" del sistema operativo en las animaciones de Motion. */
export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
