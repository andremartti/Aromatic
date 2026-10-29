/**
 * GET /functions/v1/store
 * Catálogo público: productos activos, precios, disponibilidad, zonas de envío
 * y métodos de pago habilitados. No expone inventario exacto ni datos internos.
 */
import { sql } from "../_shared/db.ts";
import { env } from "../_shared/env.ts";
import { clientIp, json, serve } from "../_shared/http.ts";
import { ipHash, rateLimit } from "../_shared/security.ts";

export const handler = serve("store", ["GET"], async (req) => {
  await rateLimit(`store:${await ipHash(clientIp(req))}`, 120, 60);
  const [row] = await sql`select app.public_catalog() as r`;
  const catalog = row.r as Record<string, unknown>;
  return json(req, {
    ...catalog,
    payments: {
      mode: env.payments.mode,
      cardProvider: env.payments.cardProvider,
      // Aviso visible en la tienda: en modo de pruebas no se cobra dinero real.
      testMode: env.payments.mode === "test",
    },
  }, 200, { "Cache-Control": "public, max-age=30" });
});

if (import.meta.main) Deno.serve(handler);
