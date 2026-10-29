/**
 * POST /functions/v1/payment-webhook?k=<PIXELPAY_WEBHOOK_TOKEN>
 * Notificación de PixelPay (order_callback). El contenido del webhook NO se
 * usa como verdad: solo indica qué pago revisar. El servidor verifica:
 *  1. el token de la URL registrada,
 *  2. el payment_hash = MD5(order_id | key_id | secret) si viene en la notificación,
 *  3. el estado real consultando a PixelPay con las credenciales secretas.
 * Es idempotente: la misma notificación repetida no cambia nada.
 */
import { sql } from "../_shared/db.ts";
import { env } from "../_shared/env.ts";
import { clientIp, json, serve } from "../_shared/http.ts";
import { findPayment, verifyAndApply } from "../_shared/payments.ts";
import { verifyPaymentHash } from "../_shared/pixelpay.ts";
import { ipHash, rateLimit, timingSafeEqual } from "../_shared/security.ts";

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const text = (await req.text()).slice(0, 64_000);
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json") || text.trim().startsWith("{")) return JSON.parse(text);
  } catch { /* se intenta como formulario */ }
  return Object.fromEntries(new URLSearchParams(text));
}

function field(body: Record<string, unknown>, key: string): string | null {
  const data = (body.data && typeof body.data === "object" ? body.data : {}) as Record<string, unknown>;
  const v = body[key] ?? data[key];
  return typeof v === "string" && v.length <= 120 ? v : null;
}

export const handler = serve("payment-webhook", ["POST"], async (req) => {
  await rateLimit(`webhook:${await ipHash(clientIp(req))}`, 120, 60);
  const url = new URL(req.url);
  if (env.pixelpay.webhookToken && !timingSafeEqual(url.searchParams.get("k") ?? "", env.pixelpay.webhookToken)) {
    return json(req, { ok: false }, 401);
  }

  const body = await readBody(req);
  const paymentUuid = field(body, "payment_uuid");
  const orderRef = field(body, "order_id");
  const hash = field(body, "payment_hash");

  const pay = await findPayment({ orderRef: orderRef ?? undefined, providerPaymentId: paymentUuid ?? undefined });
  const logKey = `webhook-raw:${paymentUuid ?? orderRef ?? crypto.randomUUID()}:${hash ?? "nohash"}`;

  if (!pay || !paymentUuid) {
    await sql`insert into app.payment_events (provider, event_key, kind, payload, outcome)
              values ('pixelpay', ${logKey}, 'webhook', ${sql.json({ order_id: orderRef, payment_uuid: paymentUuid })}, 'unmatched')
              on conflict do nothing`;
    // 200 para que PixelPay no reintente indefinidamente algo que no es nuestro.
    return json(req, { ok: true, matched: false });
  }

  if (hash && pay.provider_order_ref && !(await verifyPaymentHash(hash, pay.provider_order_ref))) {
    await sql`insert into app.payment_events (provider, event_key, kind, order_id, payment_id, payload, outcome)
              values ('pixelpay', ${logKey}, 'webhook', ${pay.order_id}::uuid, ${pay.id}::uuid,
                      ${sql.json({ order_id: orderRef, payment_uuid: paymentUuid })}, 'invalid_hash')
              on conflict do nothing`;
    return json(req, { ok: false }, 401);
  }

  const result = await verifyAndApply(pay, paymentUuid, "webhook");
  return json(req, { ok: true, outcome: (result as { outcome?: string }).outcome ?? null });
});

if (import.meta.main) Deno.serve(handler);
