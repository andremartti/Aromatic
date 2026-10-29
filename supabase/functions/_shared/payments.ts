/**
 * Lógica común de pagos con tarjeta: sesiones para el navegador y
 * confirmación verificada contra la pasarela.
 */
import { callFn, sql } from "./db.ts";
import { env } from "./env.ts";
import { HttpError } from "./http.ts";
import { browserConfig, getTransactionStatus } from "./pixelpay.ts";

/** Códigos ISO 3166-2 de los departamentos de Honduras (los pide PixelPay en billing_state). */
const HN_STATES: Record<string, string> = {
  "Atlántida": "HN-AT", "Choluteca": "HN-CH", "Colón": "HN-CL", "Comayagua": "HN-CM", "Copán": "HN-CP",
  "Cortés": "HN-CR", "El Paraíso": "HN-EP", "Francisco Morazán": "HN-FM", "Gracias a Dios": "HN-GD",
  "Intibucá": "HN-IN", "Islas de la Bahía": "HN-IB", "La Paz": "HN-LP", "Lempira": "HN-LE",
  "Ocotepeque": "HN-OC", "Olancho": "HN-OL", "Santa Bárbara": "HN-SB", "Valle": "HN-VA", "Yoro": "HN-YO",
};

interface StartResult {
  payment_id: string;
  provider_order_ref: string;
  amount: number | string;
  currency: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  ship_address: string;
  ship_city: string;
  ship_department: string;
  ship_country: string;
  items: { sku: string; name: string; price: number | string; qty: number }[];
}

/** Prepara un intento de pago y devuelve lo que necesita el navegador. */
export async function cardSession(orderNumber: string) {
  const start = await sql`select app.start_card_payment(${orderNumber}, ${env.payments.cardProvider}, ${env.payments.mode === "test"}) as r`;
  const s = start[0].r as StartResult;
  const amount = Number(s.amount).toFixed(2);
  const base = {
    provider: env.payments.cardProvider,
    mode: env.payments.mode,
    paymentId: s.payment_id,
    orderRef: s.provider_order_ref,
    amount,
    currency: s.currency,
  };
  if (env.payments.cardProvider === "simulated") return base;

  const callback = new URL(`${env.supabaseUrl}/functions/v1/payment-webhook`);
  if (env.pixelpay.webhookToken) callback.searchParams.set("k", env.pixelpay.webhookToken);
  return {
    ...base,
    pixelpay: await browserConfig(),
    customer: { name: s.customer_name, email: s.customer_email },
    billing: {
      address: s.ship_address,
      country: s.ship_country === "Honduras" ? "HN" : s.ship_country,
      state: HN_STATES[s.ship_department] ?? s.ship_department,
      city: s.ship_city,
      phone: s.customer_phone,
    },
    items: (s.items ?? []).map((i) => ({ code: i.sku, title: i.name, price: Number(i.price).toFixed(2), qty: i.qty })),
    callbackUrl: callback.toString(),
  };
}

interface PaymentRow {
  id: string;
  order_id: string;
  provider: string;
  status: string;
  amount: string;
  provider_order_ref: string | null;
  provider_payment_id: string | null;
  order_number: string;
}

export async function findPayment(by: { paymentId?: string; orderRef?: string; providerPaymentId?: string }) {
  const rows = await sql<PaymentRow[]>`
    select p.id, p.order_id, p.provider, p.status, p.amount::text, p.provider_order_ref, p.provider_payment_id, o.order_number
    from app.payments p join app.orders o on o.id = p.order_id
    where (${by.paymentId ?? null}::uuid is not null and p.id = ${by.paymentId ?? null}::uuid)
       or (${by.orderRef ?? null}::text is not null and p.provider_order_ref = ${by.orderRef ?? null})
       or (${by.providerPaymentId ?? null}::text is not null and p.provider_payment_id = ${by.providerPaymentId ?? null})
    limit 1`;
  return rows[0] ?? null;
}

/**
 * Verifica un pago con PixelPay y aplica el resultado (idempotente).
 * Nunca confía en lo que reporta el navegador ni en el cuerpo del webhook.
 */
export async function verifyAndApply(pay: PaymentRow, providerPaymentId: string, kind: "confirm" | "webhook" | "reconcile") {
  if (pay.provider !== "pixelpay") throw new HttpError(409, "invalid_state", "Este pago no es de PixelPay.");
  if (!/^[A-Za-z0-9-]{8,80}$/.test(providerPaymentId)) throw new HttpError(422, "validation", "Identificador de pago inválido.");
  if (pay.provider_payment_id && pay.provider_payment_id !== providerPaymentId) {
    throw new HttpError(409, "mismatch", "El identificador de pago no coincide.");
  }
  // Se guarda el identificador antes de consultar: si algo falla, el cron o el webhook lo reintentan.
  await sql`select app.attach_provider_payment(${pay.id}::uuid, ${providerPaymentId})`;

  const result = await getTransactionStatus(providerPaymentId, pay.provider_order_ref ?? "");
  if (result.hashVerified === false) {
    console.error(`[payments] hash inválido para ${pay.provider_order_ref}`);
    throw new HttpError(409, "mismatch", "No se pudo verificar el pago.");
  }
  if (result.status === "pending" || result.status === "unknown") {
    return { outcome: result.status, order_number: pay.order_number };
  }
  return await callFn<Record<string, unknown>>("apply_payment_result", {
    payment_id: pay.id,
    status: result.status,
    amount: result.amount,
    currency: null,
    provider_payment_id: providerPaymentId,
    reference: result.reference,
    response_code: result.code,
    response_message: result.message,
    raw: result.raw,
    event_key: `${kind === "webhook" ? "webhook" : "verify"}:${providerPaymentId}:${result.status}`,
    kind,
    actor_label: kind === "webhook" ? "PixelPay (webhook)" : "PixelPay",
  });
}

/** Vuelve a consultar pagos pendientes (los que ya tienen identificador de PixelPay). */
export async function reconcilePending(limit = 20) {
  const pending = await sql<PaymentRow[]>`
    select p.id, p.order_id, p.provider, p.status, p.amount::text, p.provider_order_ref, p.provider_payment_id, o.order_number
    from app.pending_card_payments(${limit}) p join app.orders o on o.id = p.order_id
    where p.provider = 'pixelpay'`;
  const results = [];
  for (const pay of pending) {
    try {
      results.push(await verifyAndApply(pay, pay.provider_payment_id!, "reconcile"));
    } catch (err) {
      results.push({ order_number: pay.order_number, error: String((err as Error).message).slice(0, 120) });
    }
  }
  await sql`select app.expire_stale_orders()`;
  return results;
}
