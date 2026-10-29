/**
 * Verificación de la sesión del personal (Supabase Auth).
 *
 * Producción: se valida el token preguntando a Supabase Auth (/auth/v1/user),
 * lo que también respeta cierres de sesión y usuarios bloqueados.
 * Pruebas locales (o proyectos con secreto JWT simétrico): AUTH_JWT_SECRET
 * permite validar la firma HS256 localmente.
 */
import { env } from "./env.ts";
import { HttpError } from "./http.ts";
import { sha256Hex, timingSafeEqual } from "./security.ts";

const cache = new Map<string, { userId: string; until: number }>();

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function verifyHs256(token: string): Promise<string> {
  const [h, p, sig] = token.split(".");
  if (!h || !p || !sig) throw new Error("bad token");
  const header = JSON.parse(new TextDecoder().decode(b64urlDecode(h)));
  if (header.alg !== "HS256") throw new Error("alg");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.jwtSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${h}.${p}`)));
  const given = b64urlDecode(sig);
  if (!timingSafeEqual(String.fromCharCode(...expected), String.fromCharCode(...given))) throw new Error("signature");
  const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) throw new Error("expired");
  if (claims.role !== "authenticated") throw new Error("role");
  return String(claims.sub);
}

async function verifyWithSupabase(token: string): Promise<string> {
  const res = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.anonKey },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`auth ${res.status}`);
  const user = await res.json();
  if (!user?.id) throw new Error("no user");
  return String(user.id);
}

/** Devuelve el id del usuario autenticado o responde 401. */
export async function authenticatedUserId(req: Request): Promise<string> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length > 4096 || token === env.anonKey) {
    throw new HttpError(401, "unauthorized", "Inicia sesión para continuar.");
  }
  const key = await sha256Hex(token);
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.userId;
  try {
    const userId = env.jwtSecret ? await verifyHs256(token) : await verifyWithSupabase(token);
    if (!/^[0-9a-f-]{36}$/.test(userId)) throw new Error("sub");
    cache.set(key, { userId, until: Date.now() + 60_000 });
    if (cache.size > 500) cache.clear();
    return userId;
  } catch {
    throw new HttpError(401, "unauthorized", "Tu sesión venció. Inicia sesión de nuevo.");
  }
}
