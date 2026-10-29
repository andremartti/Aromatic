/**
 * POST /functions/v1/order-status
 * Consulta segura del pedido por el cliente:
 *  - { orderNumber, token }: enlace privado de la confirmación (muestra la dirección).
 *  - { orderNumber, phone }: número de pedido + teléfono del comprador (sin dirección; límite estricto).
 *  - { action: "report_transfer", orderNumber, token, reference }: avisar una transferencia (queda por verificar).
 */
import { sql } from "../_shared/db.ts";
import { clientIp, HttpError, json, readJson, serve } from "../_shared/http.ts";
import { ipHash, rateLimit, verifyOrderToken } from "../_shared/security.ts";

export const handler = serve("order-status", ["POST"], async (req) => {
  const ip = await ipHash(clientIp(req));
  const body = await readJson<Record<string, unknown>>(req, 4_000);

  if (body.action === "report_transfer") {
    await rateLimit(`transfer:${ip}`, 10, 3600);
    const orderNumber = await verifyOrderToken(body.orderNumber, body.token);
    await sql`select app.report_transfer(${orderNumber}, ${typeof body.reference === "string" ? body.reference : ""})`;
    const [row] = await sql`select app.order_public(${orderNumber}, true) as r`;
    return json(req, { order: row.r });
  }

  if (typeof body.token === "string") {
    await rateLimit(`status:${ip}`, 60, 600);
    const orderNumber = await verifyOrderToken(body.orderNumber, body.token);
    const [row] = await sql`select app.order_public(${orderNumber}, true) as r`;
    if (!row?.r) throw new HttpError(404, "not_found", "Pedido no encontrado.");
    return json(req, { order: row.r, full: true });
  }

  // Búsqueda por teléfono: muy limitada para evitar adivinanzas.
  await rateLimit(`lookup:${ip}`, 8, 3600);
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim().toUpperCase() : "";
  const phone = typeof body.phone === "string" ? body.phone : "";
  if (!/^[A-Z]{1,4}-T?[0-9]{5,9}$/.test(orderNumber) || phone.replace(/\D/g, "").length < 7) {
    throw new HttpError(422, "validation", "Escribe el número de pedido y el teléfono con el que compraste.");
  }
  const [match] = await sql`select app.order_matches_phone(${orderNumber}, ${phone}) as ok`;
  if (!match.ok) throw new HttpError(404, "not_found", "No encontramos un pedido con esos datos.");
  const [row] = await sql`select app.order_public(${orderNumber}, false) as r`;
  return json(req, { order: row.r, full: false });
});

if (import.meta.main) Deno.serve(handler);
