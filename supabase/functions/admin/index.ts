/**
 * POST /functions/v1/admin   { fn, args }   Authorization: Bearer <token de Supabase Auth>
 *
 * Único punto de entrada del panel. Verifica la sesión y ejecuta SOLO funciones
 * de la lista blanca, como el usuario autenticado: cada función SQL comprueba
 * su rol (staff/admin/owner) y registra quién hizo el cambio.
 */
import { authenticatedUserId } from "../_shared/auth.ts";
import { callFnAs, sql } from "../_shared/db.ts";
import { env } from "../_shared/env.ts";
import { HttpError, json, readJson, serve } from "../_shared/http.ts";
import { reconcilePending, verifyAndApply } from "../_shared/payments.ts";
import { rateLimit } from "../_shared/security.ts";

const FUNCTIONS = new Set([
  "admin_me", "admin_summary",
  "admin_list_orders", "admin_get_order", "admin_update_order_status", "admin_update_payment_status",
  "admin_add_note", "admin_resolve_review", "admin_export_orders",
  "admin_save_shipment", "admin_bulk_assign_carrier", "admin_guides",
  "admin_list_customers", "admin_get_customer",
  "admin_list_products", "admin_save_product", "admin_adjust_stock", "admin_save_fragrance",
  "admin_get_settings", "admin_save_settings", "admin_save_zone", "admin_delete_zone", "admin_save_carrier",
  "admin_list_staff", "admin_set_staff", "admin_audit_log",
]);

export const handler = serve("admin", ["POST"], async (req) => {
  const userId = await authenticatedUserId(req);
  await rateLimit(`admin:${userId}`, 240, 60);
  const body = await readJson<{ fn?: string; args?: Record<string, unknown> }>(req, 256_000);
  const fn = String(body.fn ?? "");
  const args = body.args && typeof body.args === "object" ? body.args : {};

  // Consultar a PixelPay los pagos con tarjeta pendientes (de todos o de un pedido).
  if (fn === "reconcile_payments" || fn === "reconcile_order") {
    const me = await callFnAs<{ role: string }>(userId, "admin_me", {});
    if (!me) throw new HttpError(403, "forbidden", "Sin acceso.");
    if (env.payments.cardProvider !== "pixelpay") {
      return json(req, { results: [], message: "El simulador de pruebas no necesita conciliación." });
    }
    if (fn === "reconcile_payments") return json(req, { results: await reconcilePending(30) });
    const pays = await sql`
      select p.id, p.order_id, p.provider, p.status, p.amount::text, p.provider_order_ref, p.provider_payment_id, o.order_number
      from app.payments p join app.orders o on o.id = p.order_id
      where o.id = ${String(args.id ?? "")}::uuid and p.provider = 'pixelpay' and p.provider_payment_id is not null
        and p.status in ('pending', 'approved')`;
    const results = [];
    // deno-lint-ignore no-explicit-any
    for (const p of pays as any[]) results.push(await verifyAndApply(p, p.provider_payment_id, "reconcile"));
    return json(req, { results, order: await callFnAs(userId, "admin_get_order", { id: args.id }) });
  }

  if (!FUNCTIONS.has(fn)) throw new HttpError(400, "unknown_function", "Acción desconocida.");
  const data = await callFnAs(userId, fn, args);
  return json(req, { data });
});

if (import.meta.main) Deno.serve(handler);
