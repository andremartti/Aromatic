/**
 * Pruebas de integración de las funciones de servidor.
 * Ejecutar con: supabase/tests/run_function_tests.sh
 * Usa una base Postgres local con las migraciones y un servidor que imita la
 * API de PixelPay (/api/v2/transaction/status). No se conecta a servicios reales.
 */
import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1.0.13";
import { crypto as stdCrypto } from "jsr:@std/crypto@1.0.3";

const SECRET = "@s4ndb0x-abcd-1234-n1l4-p1x3l";
const KEY = "1234567890";
const JWT_SECRET = "local-test-jwt-secret-local-test-jwt-secret";
const ORIGIN = "http://localhost:3100";

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const md5 = async (s: string) => hex(await stdCrypto.subtle.digest("MD5", enc.encode(s)));
const b64url = (data: Uint8Array | string) =>
  btoa(typeof data === "string" ? data : String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// ---------------------------------------------------------------------------
//  PixelPay simulado
// ---------------------------------------------------------------------------
const pixel = new Map<string, { status: number; data: Record<string, unknown> }>();
let pixelCalls = 0;
const pixelServer = Deno.serve({ port: 0, onListen: () => {} }, async (req) => {
  pixelCalls++;
  const url = new URL(req.url);
  if (url.pathname !== "/api/v2/transaction/status") return new Response("{}", { status: 404 });
  if (req.headers.get("x-auth-key") !== KEY || req.headers.get("x-auth-hash") !== await md5(SECRET)) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (body.env !== "sandbox") return Response.json({ success: false, message: "env" }, { status: 400 });
  const r = pixel.get(body.payment_uuid);
  if (!r) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  return Response.json({ success: r.status === 200, message: r.status === 200 ? "OK" : "Declined", data: r.data }, { status: r.status });
});

async function pixelApproved(uuid: string, orderRef: string, amount: string, opts: { badHash?: boolean } = {}) {
  pixel.set(uuid, {
    status: 200,
    data: {
      payment_uuid: uuid, response_approved: true, response_code: "00", response_reason: "Aprobado",
      transaction_amount: amount, transaction_approved_amount: amount, transaction_auth: "A1B2C3",
      transaction_id: "TX-" + uuid.slice(0, 6), card_number: "411111******1111",
      payment_hash: opts.badHash ? "0".repeat(32) : await md5(`${orderRef}|${KEY}|${SECRET}`),
    },
  });
}

// ---------------------------------------------------------------------------
//  Entorno y funciones
// ---------------------------------------------------------------------------
Deno.env.set("SUPABASE_DB_URL", Deno.env.get("TEST_DB_URL") ?? "postgres://postgres@127.0.0.1:54322/aromatic_fn_test");
Deno.env.set("SUPABASE_URL", "http://127.0.0.1:54321");
Deno.env.set("ORDER_TOKEN_SECRET", "order-token-secret-for-local-tests-only-0001");
Deno.env.set("AUTH_JWT_SECRET", JWT_SECRET);
Deno.env.set("PAYMENTS_MODE", "test");
Deno.env.set("CARD_PROVIDER", "pixelpay");
Deno.env.set("PIXELPAY_ENDPOINT", `http://127.0.0.1:${pixelServer.addr.port}`);
Deno.env.set("PIXELPAY_WEBHOOK_TOKEN", "webhook-token-local");
Deno.env.set("ALLOWED_ORIGINS", ORIGIN);

const { handler: store } = await import("../functions/store/index.ts");
const { handler: checkout } = await import("../functions/checkout/index.ts");
const { handler: payment } = await import("../functions/payment/index.ts");
const { handler: webhook } = await import("../functions/payment-webhook/index.ts");
const { handler: orderStatus } = await import("../functions/order-status/index.ts");
const { handler: admin } = await import("../functions/admin/index.ts");
const { sql } = await import("../functions/_shared/db.ts");

let ipCounter = 0;
function req(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": `10.0.0.${ipCounter}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function call(h: (r: Request) => Promise<Response>, r: Request) {
  const res = await h(r);
  return { status: res.status, body: await res.json(), headers: res.headers };
}

async function jwt(userId: string, opts: { secret?: string; exp?: number } = {}) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ sub: userId, role: "authenticated", aud: "authenticated", exp: opts.exp ?? Math.floor(Date.now() / 1000) + 3600 }));
  const key = await crypto.subtle.importKey("raw", enc.encode(opts.secret ?? JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${payload}`)));
  return `${header}.${payload}.${b64url(sig)}`;
}
async function adminCall(token: string, fn: string, args: Record<string, unknown> = {}) {
  return await call(admin, req("/admin", { fn, args }, { authorization: `Bearer ${token}` }));
}

const users = await sql`insert into auth.users (email) values ('dueno@aromatic.test'), ('ajeno@aromatic.test') returning id, email`;
await sql`select app.bootstrap_owner('dueno@aromatic.test')`;
const ownerToken = await jwt(users[0].id);
const outsiderToken = await jwt(users[1].id);

const customer = { full_name: "Cliente Integración", phone: "9876-5432", email: "integracion@example.com" };
const shipping = {
  country: "HN", department: "Francisco Morazán", city: "Tegucigalpa", neighborhood: "Colonia Kennedy",
  address: "Bloque 5, casa 22, calle principal", reference: "Portón negro junto a la pulpería",
};
let variantSua = "";
const key = () => `it-${crypto.randomUUID()}`;

// ---------------------------------------------------------------------------
Deno.test({ name: "flujo completo de la tienda y el panel", sanitizeOps: false, sanitizeResources: false, fn: async (t) => {
  await t.step("CORS: solo orígenes permitidos; preflight", async () => {
    const ok = await store(new Request("http://localhost/store", { method: "OPTIONS", headers: { origin: ORIGIN } }));
    assertEquals(ok.status, 204);
    assertEquals(ok.headers.get("access-control-allow-origin"), ORIGIN);
    const evil = await store(req("/store", undefined, { origin: "https://evil.example" }));
    assertEquals(evil.headers.get("access-control-allow-origin"), null);
    await evil.body?.cancel();
  });

  await t.step("catálogo público en modo de pruebas", async () => {
    const r = await call(store, req("/store"));
    assertEquals(r.status, 200);
    assertEquals(r.body.payments.testMode, true);
    assertEquals(r.body.store.enabled, false);
    assertEquals(r.body.products.length, 3);
    variantSua = r.body.products.find((p: { slug: string }) => p.slug === "suavizante").variants[0].id;
  });

  await t.step("checkout con la tienda cerrada", async () => {
    ipCounter++;
    const r = await call(checkout, req("/checkout", { idempotencyKey: key(), paymentMethod: "card", customer, shipping,
      items: [{ variantId: variantSua, fragranceId: "floral", quantity: 1 }] }));
    assertEquals(r.status, 503);
    assertEquals(r.body.error, "store_closed");
  });

  await t.step("panel: sesión y roles", async () => {
    assertEquals((await call(admin, req("/admin", { fn: "admin_me" }))).status, 401);
    assertEquals((await adminCall(await jwt(users[0].id, { secret: "otro-secreto" }), "admin_me")).status, 401);
    assertEquals((await adminCall(await jwt(users[0].id, { exp: 1 }), "admin_me")).status, 401);
    assertEquals((await adminCall(outsiderToken, "admin_me")).status, 403);
    assertEquals((await adminCall(ownerToken, "drop_everything")).status, 400);
    const me = await adminCall(ownerToken, "admin_me");
    assertEquals(me.status, 200);
    assertEquals(me.body.data.role, "owner");
  });

  await t.step("panel: configurar tienda, zona y precios", async () => {
    let r = await adminCall(ownerToken, "admin_save_settings", { store_enabled: true, card_enabled: true, transfer_enabled: true,
      transfer_instructions: "Banco de prueba · Cuenta 000", cod_enabled: true });
    assertEquals(r.status, 200);
    r = await adminCall(ownerToken, "admin_save_zone", { name: "Todo el país", departments: [], price: "120" });
    assertEquals(r.status, 200);
    const products = (await adminCall(ownerToken, "admin_list_products")).body.data.products;
    const sua = products.find((p: { slug: string }) => p.slug === "suavizante");
    sua.variants[0].price = "275.50";
    sua.variants[0].stock = 20;
    r = await adminCall(ownerToken, "admin_save_product", sua);
    assertEquals(r.status, 200);
    r = await adminCall(ownerToken, "admin_save_product", { ...sua, slug: "Slug Inválido" });
    assertEquals(r.status, 422);
  });

  let order = { orderNumber: "", token: "", paymentId: "", orderRef: "", total: "" };
  await t.step("checkout con tarjeta: precio del servidor y sesión de PixelPay sin secretos", async () => {
    ipCounter++;
    const idem = key();
    const body = { idempotencyKey: idem, paymentMethod: "card", customer, shipping,
      items: [{ variantId: variantSua, fragranceId: "floral", quantity: 2, price: "0.01" }], total: "0.01" };
    const r = await call(checkout, req("/checkout", body));
    assertEquals(r.status, 201);
    assertEquals(r.body.total, "671.00"); // 2 × 275.50 + 120
    assertMatch(r.body.orderNumber, /^AR-T\d{5}$/);
    assertEquals(r.body.payment.provider, "pixelpay");
    assertEquals(r.body.payment.pixelpay.keyHash, await md5(SECRET));
    assertEquals(r.body.payment.pixelpay.environment, "sandbox");
    assertEquals(r.body.payment.billing.state, "HN-FM");
    assert(!JSON.stringify(r.body).includes(SECRET), "la clave secreta no debe llegar al navegador");
    assert(r.body.payment.callbackUrl.includes("payment-webhook?k=webhook-token-local"));
    order = { orderNumber: r.body.orderNumber, token: r.body.token, paymentId: r.body.payment.paymentId,
      orderRef: r.body.payment.orderRef, total: r.body.total };

    const again = await call(checkout, req("/checkout", body));
    assertEquals(again.status, 200);
    assertEquals(again.body.duplicate, true);
    assertEquals(again.body.orderNumber, order.orderNumber);
    assertEquals(again.body.token, order.token);
  });

  await t.step("confirmación: monto alterado no se acepta; el correcto sí; repetir no duplica", async () => {
    await pixelApproved("uuid-bad-amount-0001", order.orderRef, "1.00");
    let r = await call(payment, req("/payment", { action: "confirm", orderNumber: order.orderNumber, token: order.token,
      paymentId: order.paymentId, providerPaymentId: "uuid-bad-amount-0001" }));
    assertEquals(r.status, 200);
    assertEquals(r.body.result.outcome, "amount_mismatch");

    // Otro pedido para el caso aprobado (el anterior quedó en revisión).
    ipCounter++;
    const c = await call(checkout, req("/checkout", { idempotencyKey: key(), paymentMethod: "card", customer, shipping,
      items: [{ variantId: variantSua, fragranceId: "floral", quantity: 1 }] }));
    const o2 = c.body;
    await pixelApproved("uuid-good-0002", o2.payment.orderRef, o2.total);
    r = await call(payment, req("/payment", { action: "confirm", orderNumber: o2.orderNumber, token: "token-falso",
      paymentId: o2.payment.paymentId, providerPaymentId: "uuid-good-0002" }));
    assertEquals(r.status, 404);
    r = await call(payment, req("/payment", { action: "confirm", orderNumber: o2.orderNumber, token: o2.token,
      paymentId: o2.payment.paymentId, providerPaymentId: "uuid-good-0002" }));
    assertEquals(r.body.result.outcome, "approved");
    assertEquals(r.body.result.order_status, "confirmed");
    r = await call(payment, req("/payment", { action: "confirm", orderNumber: o2.orderNumber, token: o2.token,
      paymentId: o2.payment.paymentId, providerPaymentId: "uuid-good-0002" }));
    assertEquals(r.body.result.duplicate, true);
    const raw = (await sql`select raw from app.payments where provider_payment_id = 'uuid-good-0002'`)[0].raw;
    assert(!JSON.stringify(raw).includes("411111"), "no se guardan datos de tarjeta");
    r = await call(payment, req("/payment", { action: "start", orderNumber: o2.orderNumber, token: o2.token }));
    assertEquals(r.body.error, "already_paid");
    r = await call(payment, req("/payment", { action: "simulate", orderNumber: o2.orderNumber, token: o2.token,
      paymentId: o2.payment.paymentId, outcome: "approved" }));
    assertEquals(r.status, 403);
  });

  await t.step("webhook: token y hash verificados; estado consultado a PixelPay", async () => {
    ipCounter++;
    const c = (await call(checkout, req("/checkout", { idempotencyKey: key(), paymentMethod: "card", customer, shipping,
      items: [{ variantId: variantSua, fragranceId: "floral", quantity: 3 }] }))).body;
    const uuid = "uuid-webhook-0003";
    await pixelApproved(uuid, c.payment.orderRef, c.total);
    const hook = (k: string, body: Record<string, unknown>) =>
      call(webhook, new Request(`http://localhost/payment-webhook?k=${k}`, { method: "POST", body: JSON.stringify(body),
        headers: { "content-type": "application/json" } }));
    assertEquals((await hook("incorrecto", { payment_uuid: uuid, order_id: c.payment.orderRef })).status, 401);
    assertEquals((await hook("webhook-token-local", { payment_uuid: uuid, order_id: c.payment.orderRef, payment_hash: "f".repeat(32) })).status, 401);
    // El cuerpo del webhook dice "aprobado" con otro monto: se ignora y se consulta a PixelPay.
    const before = pixelCalls;
    const r = await hook("webhook-token-local", { payment_uuid: uuid, order_id: c.payment.orderRef,
      payment_hash: await md5(`${c.payment.orderRef}|${KEY}|${SECRET}`), amount: "0.01", status: "approved" });
    assertEquals(r.status, 200);
    assertEquals(r.body.outcome, "approved");
    assert(pixelCalls > before, "el webhook debe consultar a PixelPay");
    const again = await hook("webhook-token-local", { payment_uuid: uuid, order_id: c.payment.orderRef });
    assertEquals(again.body.ok, true);
    const [o] = await sql`select payment_status, status from app.orders where order_number = ${c.orderNumber}`;
    assertEquals(o.payment_status, "approved");
    const unknown = await hook("webhook-token-local", { payment_uuid: "no-existe", order_id: "AR-T99999-1" });
    assertEquals(unknown.body.matched, false);
  });

  await t.step("rechazo y nuevo intento con otra referencia", async () => {
    ipCounter++;
    const c = (await call(checkout, req("/checkout", { idempotencyKey: key(), paymentMethod: "card", customer, shipping,
      items: [{ variantId: variantSua, fragranceId: "floral", quantity: 1 }] }))).body;
    pixel.set("uuid-declined-0004", { status: 402, data: { payment_uuid: "uuid-declined-0004", response_approved: false, response_reason: "Fondos insuficientes" } });
    let r = await call(payment, req("/payment", { action: "confirm", orderNumber: c.orderNumber, token: c.token,
      paymentId: c.payment.paymentId, providerPaymentId: "uuid-declined-0004" }));
    assertEquals(r.body.result.outcome, "declined");
    r = await call(payment, req("/payment", { action: "start", orderNumber: c.orderNumber, token: c.token }));
    assertEquals(r.status, 200);
    assertEquals(r.body.payment.orderRef, `${c.orderNumber}-2`);
  });

  await t.step("consulta del pedido: token, teléfono y límite de intentos", async () => {
    ipCounter++;
    const c = (await call(checkout, req("/checkout", { idempotencyKey: key(), paymentMethod: "bank_transfer", customer, shipping,
      items: [{ variantId: variantSua, fragranceId: "floral", quantity: 1 }] }))).body;
    let r = await call(orderStatus, req("/order-status", { orderNumber: c.orderNumber, token: c.token }));
    assertEquals(r.status, 200);
    assertEquals(r.body.order.shipping.address, shipping.address);
    assert(r.body.order.transferInstructions.includes("Cuenta 000"));
    r = await call(orderStatus, req("/order-status", { orderNumber: c.orderNumber, token: "x".repeat(32) }));
    assertEquals(r.status, 404);
    r = await call(orderStatus, req("/order-status", { orderNumber: c.orderNumber, phone: "+504 9876 5432" }));
    assertEquals(r.status, 200);
    assertEquals(r.body.order.shipping.address, undefined);
    r = await call(orderStatus, req("/order-status", { action: "report_transfer", orderNumber: c.orderNumber, token: c.token, reference: "TRF-123" }));
    assertEquals(r.body.order.paymentStatus, "awaiting_verification");
    ipCounter++;
    let last = 0;
    for (let i = 0; i < 9; i++) last = (await call(orderStatus, req("/order-status", { orderNumber: c.orderNumber, phone: "0000-0000" }))).status;
    assertEquals(last, 429);
  });

  await t.step("límite de pedidos por IP", async () => {
    ipCounter++;
    let last = 0;
    for (let i = 0; i < 9; i++) {
      last = (await call(checkout, req("/checkout", { idempotencyKey: key(), paymentMethod: "cash_on_delivery", customer, shipping,
        items: [{ variantId: variantSua, fragranceId: "floral", quantity: 1 }] }))).status;
    }
    assertEquals(last, 429);
  });

  await t.step("panel: listado, guía y exportación", async () => {
    const list = await adminCall(ownerToken, "admin_list_orders", { test: true });
    assert(list.body.data.total >= 5);
    const confirmed = list.body.data.rows.find((r: { status: string }) => r.status === "confirmed");
    const g = await adminCall(ownerToken, "admin_guides", { order_ids: [confirmed.id], register_print: true });
    assertEquals(g.status, 200);
    assertMatch(g.body.data.guides[0].guideNumber, /^AR-G\d{6}$/);
    const exp = await adminCall(ownerToken, "admin_export_orders", { test: true });
    assert(exp.body.data.length >= 5);
    const rec = await adminCall(ownerToken, "reconcile_payments");
    assertEquals(rec.status, 200);
  });
} });

Deno.test({ name: "cierre", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await sql.end();
  await pixelServer.shutdown();
} });
