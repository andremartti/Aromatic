/**
 * Validación del formulario en el navegador (comodidad). El servidor repite
 * todas las validaciones: nada de esto es la última palabra.
 */
export function normalizePhone(value: string, country = "HN"): string | null {
  const raw = value.trim();
  let d = raw.replace(/\D/g, "");
  const intl = raw.startsWith("+") || raw.startsWith("00");
  if (d.startsWith("00")) d = d.slice(2);
  if (!d) return null;
  if (d.startsWith("504") && (intl || d.length === 11)) return d.length === 11 && /^504[2-9]/.test(d) ? `+${d}` : null;
  if (!intl) return country === "HN" && d.length === 8 && /^[2-9]/.test(d) ? `+504${d}` : null;
  return d.length >= 7 && d.length <= 15 && !d.startsWith("0") ? `+${d}` : null;
}

export const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.trim());

export interface CheckoutForm {
  "customer.full_name": string;
  "customer.phone": string;
  "customer.email": string;
  "shipping.country": string;
  "shipping.department": string;
  "shipping.city": string;
  "shipping.neighborhood": string;
  "shipping.address": string;
  "shipping.reference": string;
  "shipping.recipient_name": string;
  "shipping.phone": string;
  "shipping.alt_phone": string;
  "shipping.instructions": string;
  otherRecipient: boolean;
  paymentMethod: string;
}

export type FormErrors = Partial<Record<keyof CheckoutForm | "items" | "form", string>>;

const len = (v: string) => v.trim().length;

export function validateCheckout(f: CheckoutForm): FormErrors {
  const e: FormErrors = {};
  if (len(f["customer.full_name"]) < 3) e["customer.full_name"] = "Escribe tu nombre completo.";
  if (!normalizePhone(f["customer.phone"], f["shipping.country"])) e["customer.phone"] = "Escribe un teléfono válido (8 dígitos en Honduras).";
  if (!isEmail(f["customer.email"])) e["customer.email"] = "Escribe un correo electrónico válido.";
  if (!f["shipping.department"]) e["shipping.department"] = "Elige el departamento.";
  if (len(f["shipping.city"]) < 2) e["shipping.city"] = "Escribe la ciudad o municipio.";
  if (len(f["shipping.neighborhood"]) < 2) e["shipping.neighborhood"] = "Escribe la colonia, barrio o aldea.";
  if (len(f["shipping.address"]) < 8) e["shipping.address"] = "Escribe la dirección completa (calle, número de casa, bloque).";
  if (len(f["shipping.reference"]) < 3) e["shipping.reference"] = "Escribe una referencia para encontrar la dirección.";
  if (f.otherRecipient) {
    if (len(f["shipping.recipient_name"]) < 3) e["shipping.recipient_name"] = "Escribe el nombre de quien recibe.";
    if (f["shipping.phone"].trim() && !normalizePhone(f["shipping.phone"], f["shipping.country"])) {
      e["shipping.phone"] = "Escribe un teléfono válido.";
    }
  }
  if (f["shipping.alt_phone"].trim() && !normalizePhone(f["shipping.alt_phone"], f["shipping.country"])) {
    e["shipping.alt_phone"] = "Escribe un teléfono válido o déjalo vacío.";
  }
  if (!f.paymentMethod) e.paymentMethod = "Elige un método de pago.";
  return e;
}
