"use client";

import { useShop } from "./ShopProvider";

/** Aviso permanente mientras los pagos estén en modo de pruebas. */
export function TestModeBanner() {
  const { data } = useShop();
  if (!data?.payments.testMode) return null;
  return (
    <div className="test-banner" role="note">
      <strong>Modo de pruebas.</strong> Los pedidos quedan marcados como prueba y no se cobra dinero real.
    </div>
  );
}
