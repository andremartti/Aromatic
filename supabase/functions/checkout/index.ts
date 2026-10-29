/**
 * POST /functions/v1/checkout
 * Crea el pedido. Los precios, el envío y el inventario se calculan en la base
 * de datos (app.place_order); el navegador solo envía qué quiere comprar.
 * La clave de idempotencia evita pedidos duplicados por doble clic o reintentos.
 */
import { callFn, sql } from "../_shared/db.ts";
import { assertConfigured, env } from "../_shared/env.ts";
import { clientIp, HttpError, json, readJson, serve } from "../_shared/http.ts";
import { cardSession } from "../_shared/payments.ts";
import { ipHash, orderToken, rateLimit } from "../_shared/security.ts";

interface CheckoutBody {
  idempotencyKey?: string;
  paymentMethod?: string;
  customer?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
  items?: { variantId?: string; fragranceId?: string | null; quantity?: number }[];
}

const pick = (o: Record<string, unknown> | undefined, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, typeof o?.[k] === "string" ? (o[k] as string).slice(0, 400) : null]));

export const handler = serve("checkout", ["POST"], async (req) => {
  const missing = assertConfigured();
  if (missing.length) {
    console.error(`[checkout] configuración incompleta: ${missing.join(", ")}`);
    throw new HttpError(503, "not_configured", "La tienda en línea todavía no está configurada.");
  }
  const ip = await ipHash(clientIp(req));
  await rateLimit(`checkout:${ip}`, 8, 600);

  const body = await readJson<CheckoutBody>(req);
  if (!Array.isArray(body.items)) throw new HttpError(422, "validation", "Tu carrito está vacío.", "items");

  // Limpia la expiración de pedidos viejos (por si pg_cron no está activo).
  await sql`select app.expire_stale_orders()`;

  const result = await callFn<{
    order_number: string; total: string; currency: string; payment_method: string; duplicate: boolean;
    status: string; payment_status: string;
  }>("place_order", {
    idempotency_key: body.idempotencyKey,
    is_test: env.payments.mode === "test",
    ip_hash: ip,
    payment_method: body.paymentMethod,
    payment_provider: env.payments.cardProvider,
    customer: pick(body.customer, ["full_name", "phone", "email"]),
    shipping: pick(body.shipping, [
      "recipient_name", "phone", "alt_phone", "country", "department", "city", "neighborhood", "address",
      "reference", "instructions",
    ]),
    items: body.items.slice(0, 50).map((i) => ({
      variant_id: typeof i.variantId === "string" ? i.variantId : null,
      fragrance_id: typeof i.fragranceId === "string" ? i.fragranceId : null,
      quantity: Number.isInteger(i.quantity) ? i.quantity : 0,
    })),
  });

  const token = await orderToken(result.order_number);
  let payment = null;
  if (result.payment_method === "card" && result.payment_status !== "approved" && result.status === "pending") {
    payment = await cardSession(result.order_number);
  }
  return json(req, {
    orderNumber: result.order_number,
    token,
    total: Number(result.total).toFixed(2),
    currency: result.currency,
    paymentMethod: result.payment_method,
    duplicate: result.duplicate,
    testMode: env.payments.mode === "test",
    payment,
  }, result.duplicate ? 200 : 201);
});

if (import.meta.main) Deno.serve(handler);
