/**
 * Servidor de desarrollo local: monta las funciones como en Supabase
 * (http://127.0.0.1:54321/functions/v1/<nombre>) y un PixelPay SIMULADO en
 * http://127.0.0.1:54330 que imita la API que usa el SDK del navegador
 * (llave pública, venta y consulta de estado). Nada de esto se despliega.
 *
 *   deno run -A supabase/tests/dev_server.ts
 *
 * Variables: DEV_DB_URL (base local con migraciones + dev_seed.sql), CARD_PROVIDER (pixelpay|simulated),
 * DEV_ALLOWED_ORIGINS (orígenes del navegador permitidos, separados por coma).
 */
import nacl from "npm:tweetnacl@1.0.3";
import { crypto as stdCrypto } from "jsr:@std/crypto@1.0.3";

const SECRET = "@s4ndb0x-abcd-1234-n1l4-p1x3l";
const KEY = "1234567890";
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const md5 = async (s: string) => hex(await stdCrypto.subtle.digest("MD5", new TextEncoder().encode(s)));

Deno.env.set("SUPABASE_DB_URL", Deno.env.get("DEV_DB_URL") ?? "postgres://postgres@127.0.0.1:54322/aromatic_dev");
Deno.env.set("SUPABASE_URL", "http://127.0.0.1:54321");
Deno.env.set("ORDER_TOKEN_SECRET", "dev-order-token-secret-solo-local-000000000");
Deno.env.set("AUTH_JWT_SECRET", "dev-jwt-secret-solo-local-dev-jwt-secret-000");
Deno.env.set("PAYMENTS_MODE", "test");
Deno.env.set("CARD_PROVIDER", Deno.env.get("CARD_PROVIDER") ?? "pixelpay");
Deno.env.set("PIXELPAY_ENDPOINT", "http://127.0.0.1:54330");
Deno.env.set("PIXELPAY_WEBHOOK_TOKEN", "dev-webhook");
Deno.env.set("ALLOWED_ORIGINS", Deno.env.get("DEV_ALLOWED_ORIGINS") ?? "http://localhost:3100,http://127.0.0.1:3100");

const names = ["store", "checkout", "payment", "payment-webhook", "order-status", "admin"];
const handlers: Record<string, (r: Request) => Promise<Response>> = {};
for (const n of names) handlers[n] = (await import(`../functions/${n}/index.ts`)).handler;

Deno.serve({ port: 54321, hostname: "127.0.0.1" }, (req) => {
  const m = new URL(req.url).pathname.match(/^\/functions\/v1\/([a-z-]+)/);
  const h = m && handlers[m[1]];
  return h ? h(req) : new Response("not found", { status: 404 });
});

// ---------------------------------------------------------------------------
//  PixelPay simulado (sandbox local)
// ---------------------------------------------------------------------------
const keys = nacl.box.keyPair();
const publicKey = btoa(String.fromCharCode(...keys.publicKey));
const sales = new Map<string, Record<string, unknown>>();
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve({ port: 54330, hostname: "127.0.0.1" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const path = new URL(req.url).pathname;
  if (req.headers.get("x-auth-key") !== KEY || req.headers.get("x-auth-hash") !== await md5(SECRET)) {
    return reply({ success: false, message: "Credenciales inválidas" }, 401);
  }
  if (path === "/api/v2/merchant/public_key") return reply({ success: true, data: { public_key: publicKey } });
  const body = await req.json().catch(() => ({}));
  if (path === "/api/v2/transaction/sale") {
    if (!req.headers.get("x-auth-secure")) return reply({ success: false, message: "Falta cifrado" }, 412);
    const uuid = `P-${crypto.randomUUID()}`;
    const data = {
      payment_uuid: uuid, response_approved: true, response_code: "00", response_reason: "Aprobado (simulado)",
      transaction_amount: body.order_amount, transaction_approved_amount: body.order_amount,
      transaction_auth: String(Math.floor(Math.random() * 900000 + 100000)), transaction_id: uuid.slice(2, 10),
      payment_hash: await md5(`${body.order_id}|${KEY}|${SECRET}`),
    };
    sales.set(uuid, data);
    console.log(`[pixelpay-sim] venta ${body.order_id} ${body.order_currency} ${body.order_amount} cifrada=${String(body.card_number).length > 30}`);
    return reply({ success: true, message: "Transacción aprobada", data });
  }
  if (path === "/api/v2/transaction/status") {
    const data = sales.get(body.payment_uuid);
    return data ? reply({ success: true, message: "OK", data }) : reply({ success: false, message: "No encontrado" }, 404);
  }
  return reply({ success: false, message: "Ruta no simulada" }, 404);
});

console.log("Funciones: http://127.0.0.1:54321/functions/v1/<nombre> · PixelPay simulado: http://127.0.0.1:54330");
