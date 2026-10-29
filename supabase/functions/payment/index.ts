/**
 * POST /functions/v1/payment
 * Acciones del pago con tarjeta (siempre con número de pedido + token):
 *  - start:    nuevo intento (p. ej. después de un rechazo).
 *  - confirm:  el navegador recibió una respuesta de PixelPay → el servidor la
 *              verifica consultando a PixelPay y recién entonces actualiza el pedido.
 *  - simulate: SOLO en modo de pruebas con el simulador (nunca en producción).
 */
import { callFn, sql } from "../_shared/db.ts";
import { env } from "../_shared/env.ts";
import { clientIp, HttpError, json, readJson, serve } from "../_shared/http.ts";
import { cardSession, findPayment, verifyAndApply } from "../_shared/payments.ts";
import { ipHash, rateLimit, verifyOrderToken } from "../_shared/security.ts";

export const handler = serve("payment", ["POST"], async (req) => {
  const ip = await ipHash(clientIp(req));
  await rateLimit(`payment:${ip}`, 30, 600);
  const body = await readJson<Record<string, unknown>>(req);
  const orderNumber = await verifyOrderToken(body.orderNumber, body.token);

  if (body.action === "start") {
    return json(req, { payment: await cardSession(orderNumber) });
  }

  const pay = typeof body.paymentId === "string" && /^[0-9a-f-]{36}$/.test(body.paymentId)
    ? await findPayment({ paymentId: body.paymentId })
    : null;
  if (!pay || pay.order_number !== orderNumber) throw new HttpError(404, "not_found", "Pago no encontrado.");

  if (body.action === "confirm") {
    if (typeof body.providerPaymentId !== "string") throw new HttpError(422, "validation", "Falta el identificador del pago.");
    const result = await verifyAndApply(pay, body.providerPaymentId, "confirm");
    return json(req, { result });
  }

  if (body.action === "simulate") {
    if (env.payments.mode !== "test" || env.payments.cardProvider !== "simulated" || pay.provider !== "simulated") {
      throw new HttpError(403, "forbidden", "El simulador solo existe en modo de pruebas.");
    }
    const approved = body.outcome === "approved";
    const [order] = await sql`select total::text from app.orders where order_number = ${orderNumber}`;
    const fakeId = `SIM-${crypto.randomUUID()}`;
    const result = await callFn("apply_payment_result", {
      payment_id: pay.id,
      status: approved ? "approved" : "declined",
      amount: order.total,
      provider_payment_id: fakeId,
      reference: approved ? "SIMULADO" : null,
      response_message: approved ? "Pago simulado (modo de pruebas)" : "Rechazo simulado (modo de pruebas)",
      raw: { simulated: true },
      event_key: `simulate:${fakeId}`,
      kind: "confirm",
      actor_label: "Simulador de pagos (pruebas)",
    });
    return json(req, { result });
  }

  throw new HttpError(400, "bad_action", "Acción inválida.");
});

if (import.meta.main) Deno.serve(handler);
