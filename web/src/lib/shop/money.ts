const formatters = new Map<string, Intl.NumberFormat>();

/** Monto con su moneda (HNL → "L 1,234.50"). Acepta números o textos numéricos del servidor. */
export function money(amount: string | number | null | undefined, currency = "HNL"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("es-HN", { style: "currency", currency, minimumFractionDigits: 2 });
    formatters.set(currency, f);
  }
  return f.format(n);
}

export const toNumber = (v: string | number | null | undefined): number => (v === null || v === undefined ? NaN : Number(v));
