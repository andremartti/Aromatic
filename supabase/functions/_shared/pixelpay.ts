/**
 * PixelPay (Honduras) · cliente de servidor.
 *
 * Basado en los SDK oficiales (@pixelpay/sdk-core 2.5.x y pixelpay-sdk 2.2.x):
 *  - Endpoints: POST {endpoint}/api/v2/transaction/{sale|status|void|refund}
 *  - Encabezados: x-auth-key (Key ID) y x-auth-hash (MD5 de la clave secreta).
 *  - Sandbox: https://pixelpay.dev con credenciales públicas del SDK.
 *  - Verificación de integridad: payment_hash = MD5(order_id | key_id | secret).
 *
 * El cobro (sale) lo hace el navegador con el SDK oficial: los datos de la
 * tarjeta van directo del cliente a PixelPay y nunca pasan por este servidor.
 * Aquí solo se CONSULTA el resultado con las credenciales secretas para
 * confirmarlo antes de marcar un pedido como pagado.
 */
import { env } from "./env.ts";
import { md5Hex, timingSafeEqual } from "./security.ts";

export interface PixelPayResult {
  /** approved: aprobado · declined: rechazado · pending: incompleto/en proceso · unknown: no encontrado o sin datos. */
  status: "approved" | "declined" | "pending" | "unknown";
  amount: string | null;
  paymentUuid: string | null;
  reference: string | null;
  code: string | null;
  message: string | null;
  hashVerified: boolean | null;
  raw: Record<string, unknown>;
}

/** Campos que se guardan de la respuesta (nunca datos de tarjeta). */
const SAFE_FIELDS = [
  "transaction_type", "transaction_approved_amount", "transaction_amount", "transaction_auth", "transaction_id",
  "transaction_reference", "transaction_time", "transaction_date", "response_approved", "response_incomplete",
  "response_code", "response_reason", "payment_uuid", "installment_type", "installment_months",
];

export function sanitize(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of SAFE_FIELDS) if (data && data[k] !== undefined && data[k] !== null) out[k] = data[k];
  return out;
}

export async function authHash(): Promise<string> {
  return await md5Hex(env.pixelpay.secret);
}

/** Configuración que necesita el SDK del navegador (Key ID y hash; nunca la clave secreta). */
export async function browserConfig() {
  return {
    endpoint: env.pixelpay.endpoint,
    keyId: env.pixelpay.keyId,
    keyHash: await authHash(),
    environment: env.pixelpay.environment,
    authentication: env.pixelpay.threeDS,
  };
}

export async function verifyPaymentHash(hash: string, orderRef: string): Promise<boolean> {
  const expected = await md5Hex([orderRef, env.pixelpay.keyId, env.pixelpay.secret].join("|"));
  return timingSafeEqual(expected, String(hash).toLowerCase());
}

/** Consulta el estado de un pago en PixelPay con las credenciales del servidor. */
export async function getTransactionStatus(paymentUuid: string, orderRef: string): Promise<PixelPayResult> {
  const body: Record<string, unknown> = { payment_uuid: paymentUuid, lang: "es" };
  if (env.pixelpay.environment) body.env = env.pixelpay.environment;

  const res = await fetch(`${env.pixelpay.endpoint}/api/v2/transaction/status`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-auth-key": env.pixelpay.keyId,
      "x-auth-hash": await authHash(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  let payload: { success?: boolean; message?: string; data?: Record<string, unknown> } = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }
  const data = payload.data ?? {};
  const raw = { http: res.status, success: payload.success ?? false, ...sanitize(data) };

  let hashVerified: boolean | null = null;
  if (typeof data.payment_hash === "string" && data.payment_hash) {
    hashVerified = await verifyPaymentHash(data.payment_hash, orderRef);
  }

  const amountValue = data.transaction_approved_amount ?? data.transaction_amount;
  const base = {
    amount: amountValue === undefined || amountValue === null || amountValue === "" ? null : Number(amountValue).toFixed(2),
    paymentUuid: typeof data.payment_uuid === "string" ? data.payment_uuid : paymentUuid,
    reference: [data.transaction_auth, data.transaction_reference ?? data.transaction_id].filter(Boolean).join(" / ") || null,
    code: data.response_code != null ? String(data.response_code) : null,
    message: (data.response_reason as string) ?? payload.message ?? null,
    hashVerified,
    raw,
  };

  if (res.status === 401 || res.status === 403) throw new Error(`PixelPay rechazó las credenciales (${res.status})`);
  if (res.status >= 500) throw new Error(`PixelPay no disponible (${res.status})`);
  if (res.status === 404) return { status: "unknown", ...base };
  if (res.status === 402) return { status: "declined", ...base };
  if (res.status === 408 || data.response_incomplete === true) return { status: "pending", ...base };
  if (res.status === 200 && payload.success && data.response_approved === true) return { status: "approved", ...base };
  if (data.response_approved === false) return { status: "declined", ...base };
  return { status: "unknown", ...base };
}
