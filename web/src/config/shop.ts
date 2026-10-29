/**
 * Tienda en línea (Supabase).
 *
 * NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son públicos por
 * diseño (la clave anon no da acceso a los datos: todo pasa por las funciones
 * de servidor). Mientras no estén configurados, el sitio funciona como hasta
 * ahora: catálogo con consultas por WhatsApp, sin carrito.
 *
 * NEXT_PUBLIC_FUNCTIONS_URL solo se usa para apuntar a funciones locales en desarrollo.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const FUNCTIONS_URL = (
  process.env.NEXT_PUBLIC_FUNCTIONS_URL || (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "")
).replace(/\/+$/, "");

/** Hay backend configurado (la tienda puede estar abierta o cerrada desde el panel). */
export const shopConfigured = Boolean(FUNCTIONS_URL);

/** Departamentos de Honduras (mismo listado que valida el servidor). */
export const HN_DEPARTMENTS = [
  "Atlántida", "Choluteca", "Colón", "Comayagua", "Copán", "Cortés", "El Paraíso", "Francisco Morazán",
  "Gracias a Dios", "Intibucá", "Islas de la Bahía", "La Paz", "Lempira", "Ocotepeque", "Olancho",
  "Santa Bárbara", "Valle", "Yoro",
] as const;

export const COUNTRY_NAMES: Record<string, string> = { HN: "Honduras" };

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Tarjeta de crédito o débito",
  bank_transfer: "Transferencia bancaria",
  cash_on_delivery: "Pago contra entrega",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready_to_ship: "Listo para enviar",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  returned: "Devuelto",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente de pago",
  awaiting_verification: "Pago por verificar",
  approved: "Pagado",
  declined: "Pago rechazado",
  cancelled: "Pago cancelado",
  refunded: "Reembolsado",
};
