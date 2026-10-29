/**
 * Configuración de las funciones de servidor (variables de entorno / secretos de Supabase).
 * Ver supabase/functions/.env.example. Ningún secreto vive en el repositorio.
 */

function read(name: string, fallback = ""): string {
  return (Deno.env.get(name) ?? fallback).trim();
}

export type PaymentsMode = "test" | "live";
export type CardProvider = "pixelpay" | "simulated";

const mode = read("PAYMENTS_MODE", "test") === "live" ? "live" : "test";
const provider = read("CARD_PROVIDER", "pixelpay") === "simulated" ? "simulated" : "pixelpay";

/** PixelPay: credenciales oficiales de sandbox publicadas en su SDK (pixelpay-sdk, setupSandbox). */
const PIXELPAY_SANDBOX = {
  endpoint: "https://pixelpay.dev",
  keyId: "1234567890",
  secret: "@s4ndb0x-abcd-1234-n1l4-p1x3l",
};

export const env = {
  dbUrl: read("SUPABASE_DB_URL"),
  supabaseUrl: read("SUPABASE_URL"),
  anonKey: read("SUPABASE_ANON_KEY"),
  /** Solo pruebas locales o proyectos con secreto JWT simétrico (HS256). */
  jwtSecret: read("AUTH_JWT_SECRET"),
  allowedOrigins: read("ALLOWED_ORIGINS", "https://andremartti.github.io")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  /** Secreto para firmar los enlaces de consulta de pedidos (mín. 32 caracteres). */
  orderTokenSecret: read("ORDER_TOKEN_SECRET"),
  publicSiteUrl: read("PUBLIC_SITE_URL", "https://andremartti.github.io/Aromatic").replace(/\/+$/, ""),
  payments: {
    mode: mode as PaymentsMode,
    /** En modo live nunca se usa el simulador. */
    cardProvider: (mode === "live" ? "pixelpay" : provider) as CardProvider,
  },
  pixelpay: {
    endpoint: mode === "live" ? read("PIXELPAY_ENDPOINT", "https://pixelpay.app") : read("PIXELPAY_ENDPOINT", PIXELPAY_SANDBOX.endpoint),
    keyId: mode === "live" ? read("PIXELPAY_KEY_ID") : read("PIXELPAY_KEY_ID", PIXELPAY_SANDBOX.keyId),
    secret: mode === "live" ? read("PIXELPAY_SECRET_KEY") : read("PIXELPAY_SECRET_KEY", PIXELPAY_SANDBOX.secret),
    environment: mode === "live" ? null : "sandbox",
    /** Token en la URL del webhook: descarta llamadas que no vienen de la URL registrada. */
    webhookToken: read("PIXELPAY_WEBHOOK_TOKEN"),
    /** Pedir autenticación 3-D Secure en cada venta (el SDK del navegador muestra el reto del banco). */
    threeDS: read("PIXELPAY_3DS") === "true",
  },
};

export function assertConfigured(): string[] {
  const missing: string[] = [];
  if (!env.dbUrl) missing.push("SUPABASE_DB_URL");
  if (env.orderTokenSecret.length < 32) missing.push("ORDER_TOKEN_SECRET (mín. 32 caracteres)");
  if (env.payments.mode === "live" && (!env.pixelpay.keyId || !env.pixelpay.secret)) {
    missing.push("PIXELPAY_KEY_ID / PIXELPAY_SECRET_KEY");
  }
  return missing;
}
