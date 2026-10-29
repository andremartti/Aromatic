import { crypto as stdCrypto } from "jsr:@std/crypto@1.0.3";
import { env } from "./env.ts";
import { sql } from "./db.ts";
import { HttpError } from "./http.ts";

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}

export async function md5Hex(value: string): Promise<string> {
  return toHex(await stdCrypto.subtle.digest("MD5", enc.encode(value)));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(secret: string, message: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await crypto.subtle.sign("HMAC", key, enc.encode(message));
}

/**
 * Token del enlace de consulta de un pedido: HMAC del número de pedido con
 * ORDER_TOKEN_SECRET. No se guarda en la base: se recalcula para verificarlo.
 */
export async function orderToken(orderNumber: string): Promise<string> {
  if (env.orderTokenSecret.length < 32) throw new Error("ORDER_TOKEN_SECRET no configurado");
  return b64url(await hmac(env.orderTokenSecret, `order:${orderNumber}`)).slice(0, 32);
}

export async function verifyOrderToken(orderNumber: unknown, token: unknown): Promise<string> {
  if (typeof orderNumber !== "string" || !/^[A-Z]{1,4}-T?[0-9]{5,9}$/.test(orderNumber) || typeof token !== "string") {
    throw new HttpError(404, "not_found", "Pedido no encontrado.");
  }
  if (!timingSafeEqual(await orderToken(orderNumber), token)) {
    throw new HttpError(404, "not_found", "Pedido no encontrado.");
  }
  return orderNumber;
}

export async function ipHash(ip: string): Promise<string> {
  return (await sha256Hex(`ip:${env.orderTokenSecret}:${ip}`)).slice(0, 32);
}

/** Límite de solicitudes por IP y ruta (ventana fija en Postgres). */
export async function rateLimit(bucket: string, max: number, windowSeconds: number): Promise<void> {
  const [row] = await sql`select app.rate_limit_hit(${bucket}, ${max}, ${windowSeconds}) as ok`;
  if (!row.ok) throw new HttpError(429, "rate_limited", "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.");
}
