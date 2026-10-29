/**
 * Cliente de las funciones de servidor de la tienda.
 * El navegador nunca envía precios: solo qué quiere comprar.
 */
import { FUNCTIONS_URL } from "@/config/shop";

export interface StoreVariant {
  id: string;
  sku: string;
  presentation: string;
  price: string | number | null;
  imageUrl: string | null;
  available: boolean;
  maxQuantity: number | null;
}
export interface StoreProduct {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: string;
  use: string | null;
  summary: string | null;
  description: string | null;
  imageUrl: string | null;
  fragrances: { id: string; name: string }[];
  variants: StoreVariant[];
}
export interface ShippingZone {
  id: string;
  name: string;
  country: string;
  departments: string[];
  price: string | number;
  freeOver: string | number | null;
  estimatedDays: string | null;
}
export interface StoreData {
  store: {
    enabled: boolean;
    currency: string;
    pricesIncludeTax: boolean;
    allowedCountries: string[];
    maxUnitsPerOrder: number;
    paymentMethods: Record<"card" | "bank_transfer" | "cash_on_delivery", boolean>;
    codInstructions: string | null;
  };
  products: StoreProduct[];
  shippingZones: ShippingZone[];
  payments: { mode: "test" | "live"; cardProvider: "pixelpay" | "simulated"; testMode: boolean };
}

export interface PixelPaySession {
  provider: "pixelpay";
  mode: "test" | "live";
  paymentId: string;
  orderRef: string;
  amount: string;
  currency: string;
  pixelpay: { endpoint: string; keyId: string; keyHash: string; environment: string | null; authentication?: boolean };
  customer: { name: string; email: string | null };
  billing: { address: string; country: string; state: string; city: string; phone: string };
  items: { code: string; title: string; price: string; qty: number }[];
  callbackUrl: string;
}
export interface SimulatedSession {
  provider: "simulated";
  mode: "test";
  paymentId: string;
  orderRef: string;
  amount: string;
  currency: string;
}
export type PaymentSession = PixelPaySession | SimulatedSession;

export interface CheckoutResult {
  orderNumber: string;
  token: string;
  total: string;
  currency: string;
  paymentMethod: string;
  duplicate: boolean;
  testMode: boolean;
  payment: PaymentSession | null;
}

export interface PublicOrder {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  isTest: boolean;
  currency: string;
  subtotal: string | number;
  discount: string | number;
  shippingCost: string | number;
  total: string | number;
  customerName: string;
  shipping: Record<string, string | null>;
  items: { sku: string; name: string; presentation: string; fragrance: string | null; unitPrice: string | number; quantity: number; lineTotal: string | number }[];
  shipment: { carrier: string | null; tracking: string | null; trackingUrl: string | null } | null;
  transferInstructions: string | null;
  codInstructions: string | null;
  canPayAgain: boolean;
  canReportTransfer: boolean;
  timeline: { at: string; kind: string; to: string | null }[] | null;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public field?: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "network", "No pudimos conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? "error", body.message ?? "Ocurrió un error. Inténtalo de nuevo.", body.field);
  }
  return body as T;
}

const post = <T>(path: string, body: unknown, headers?: Record<string, string>) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body), headers });

export const shopApi = {
  store: () => request<StoreData>("store"),
  checkout: (body: unknown) => post<CheckoutResult>("checkout", body),
  startPayment: (orderNumber: string, token: string) =>
    post<{ payment: PaymentSession }>("payment", { action: "start", orderNumber, token }),
  confirmPayment: (orderNumber: string, token: string, paymentId: string, providerPaymentId: string) =>
    post<{ result: { outcome?: string; duplicate?: boolean } }>("payment", { action: "confirm", orderNumber, token, paymentId, providerPaymentId }),
  simulatePayment: (orderNumber: string, token: string, paymentId: string, outcome: "approved" | "declined") =>
    post<{ result: unknown }>("payment", { action: "simulate", orderNumber, token, paymentId, outcome }),
  order: (orderNumber: string, token: string) =>
    post<{ order: PublicOrder; full: boolean }>("order-status", { orderNumber, token }),
  lookup: (orderNumber: string, phone: string) =>
    post<{ order: PublicOrder; full: boolean }>("order-status", { orderNumber, phone }),
  reportTransfer: (orderNumber: string, token: string, reference: string) =>
    post<{ order: PublicOrder }>("order-status", { action: "report_transfer", orderNumber, token, reference }),
  admin: <T>(fn: string, args: unknown, accessToken: string) =>
    post<T>("admin", { fn, args }, { Authorization: `Bearer ${accessToken}` }),
};
