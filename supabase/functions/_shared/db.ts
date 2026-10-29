import postgres from "npm:postgres@3.4.5";
import { env } from "./env.ts";

/**
 * Conexión directa a Postgres (SUPABASE_DB_URL). Se recomienda la URL del
 * pooler en modo transacción (puerto 6543); por eso `prepare: false`.
 */
export const sql = postgres(env.dbUrl || "postgres://invalid", {
  prepare: false,
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
});

/** Llama a una función SQL `app.<fn>(jsonb)` y devuelve su resultado. */
export async function callFn<T = unknown>(fn: string, payload: unknown): Promise<T> {
  if (!/^[a-z_]+$/.test(fn)) throw new Error("Nombre de función inválido");
  // El objeto se pasa tal cual: postgres.js lo serializa como jsonb (no usar JSON.stringify: lo codificaría dos veces).
  const rows = await sql.unsafe(`select app.${fn}($1::jsonb) as r`, [sql.json((payload ?? {}) as Parameters<typeof sql.json>[0])]);
  return rows[0].r as T;
}

/** Igual que callFn pero como un usuario del personal (RLS/roles leen auth.uid()). */
export async function callFnAs<T = unknown>(userId: string, fn: string, payload: unknown): Promise<T> {
  if (!/^[a-z_]+$/.test(fn)) throw new Error("Nombre de función inválido");
  return await sql.begin(async (tx) => {
    // set_config(..., true) solo vale dentro de esta transacción: nunca se filtra a otra solicitud.
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
    const rows = await tx.unsafe(`select app.${fn}($1::jsonb) as r`, [sql.json((payload ?? {}) as Parameters<typeof sql.json>[0])]);
    return rows[0].r as T;
  }) as T;
}
