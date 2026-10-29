import { env } from "./env.ts";

/** Error con respuesta HTTP controlada (nunca expone detalles internos). */
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public field?: string) {
    super(message);
  }
}

const SQL_CODE_STATUS: Record<string, number> = {
  validation: 422,
  store_closed: 503,
  payment_method_unavailable: 422,
  product_unavailable: 409,
  price_unavailable: 409,
  out_of_stock: 409,
  shipping_unavailable: 422,
  too_many_items: 422,
  not_found: 404,
  already_paid: 409,
  order_cancelled: 409,
  invalid_state: 409,
  invalid_transition: 409,
  payment_required: 409,
  payment_in_review: 409,
  too_many_attempts: 429,
  too_many: 422,
  mismatch: 409,
};

export function corsHeaders(req: Request): Record<string, string> {
  const origin = (req.headers.get("origin") ?? "").replace(/\/+$/, "");
  const allowed = env.allowedOrigins.includes(origin);
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders(req),
      ...extra,
    },
  });
}

/** Lee JSON con límite de tamaño. */
export async function readJson<T = Record<string, unknown>>(req: Request, maxBytes = 32_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "too_large", "Solicitud demasiado grande.");
  try {
    const value = JSON.parse(text || "{}");
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error();
    return value as T;
  } catch {
    throw new HttpError(400, "bad_json", "Solicitud inválida.");
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Convierte errores de Postgres/propios en respuestas HTTP seguras. */
export function errorResponse(req: Request, err: unknown, scope: string): Response {
  const e = err as { code?: string; message?: string; detail?: string; hint?: string; status?: number };
  if (err instanceof HttpError) {
    return json(req, { error: err.code, message: err.message, field: err.field }, err.status);
  }
  if (e?.code === "P0001" && e.message) {
    return json(req, { error: e.message, message: e.hint ?? "Solicitud inválida.", field: e.detail || undefined },
      SQL_CODE_STATUS[e.message] ?? 400);
  }
  if (e?.code === "42501") {
    return json(req, { error: "forbidden", message: e.hint ?? "No tienes permiso para esta acción." }, 403);
  }
  // Registro sin datos personales: solo el alcance y el código del error.
  const ref = crypto.randomUUID().slice(0, 8);
  console.error(`[${scope}] ref=${ref} code=${e?.code ?? "?"} ${String(e?.message ?? err).slice(0, 300)}`);
  return json(req, { error: "server_error", message: `Ocurrió un error. Inténtalo de nuevo (ref. ${ref}).` }, 500);
}

/** Envoltura común: CORS, métodos permitidos y manejo de errores. */
export function serve(scope: string, methods: string[], handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
    if (!methods.includes(req.method)) return json(req, { error: "method_not_allowed" }, 405);
    try {
      return await handler(req);
    } catch (err) {
      return errorResponse(req, err, scope);
    }
  };
}
