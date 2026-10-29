"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_NAMES, HN_DEPARTMENTS, PAYMENT_METHOD_LABELS } from "@/config/shop";
import { ApiError, shopApi, type ShippingZone } from "@/lib/shop/api";
import { money, toNumber } from "@/lib/shop/money";
import { validateCheckout, type CheckoutForm, type FormErrors } from "@/lib/shop/validation";
import { useShop } from "./ShopProvider";
import { ShopThumb } from "./ShopThumb";
import { TestModeBanner } from "./TestModeBanner";
import { SelectField, TextArea, TextField } from "./fields";

const EMPTY: CheckoutForm = {
  "customer.full_name": "", "customer.phone": "", "customer.email": "",
  "shipping.country": "HN", "shipping.department": "", "shipping.city": "", "shipping.neighborhood": "",
  "shipping.address": "", "shipping.reference": "", "shipping.recipient_name": "", "shipping.phone": "",
  "shipping.alt_phone": "", "shipping.instructions": "", otherRecipient: false, paymentMethod: "",
};

const DRAFT_KEY = "aromatic-checkout-draft";

/** Borrador local (sin datos de pago). El formulario solo se pinta en el cliente, después de cargar la tienda. */
function readDraft(): CheckoutForm {
  if (typeof window === "undefined") return EMPTY;
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
    if (draft && typeof draft === "object") return { ...EMPTY, ...draft, paymentMethod: "" };
  } catch { /* sin borrador */ }
  return EMPTY;
}
const IDEM_KEY = "aromatic-checkout-idem";

const METHOD_HELP: Record<string, string> = {
  card: "Pago seguro con PixelPay. Los datos de tu tarjeta van directo a PixelPay: no pasan por nuestros servidores ni se guardan.",
  bank_transfer: "Al confirmar verás los datos de la cuenta. Preparamos tu pedido cuando verifiquemos la transferencia.",
  cash_on_delivery: "Pagas al recibir tu pedido. Te contactaremos para confirmarlo.",
};

function zoneFor(zones: ShippingZone[], country: string, department: string) {
  return (
    zones.find((z) => z.country === country && z.departments.includes(department)) ??
    zones.find((z) => z.country === country && z.departments.length === 0) ??
    null
  );
}

/** Clave de idempotencia: la misma mientras el carrito no cambie (reintentos no duplican pedidos). */
function idempotencyKey(signature: string): string {
  try {
    const saved = JSON.parse(sessionStorage.getItem(IDEM_KEY) ?? "null");
    if (saved?.sig === signature && typeof saved.key === "string") return saved.key;
    const key = `web-${crypto.randomUUID()}`;
    sessionStorage.setItem(IDEM_KEY, JSON.stringify({ sig: signature, key }));
    return key;
  } catch {
    return `web-${crypto.randomUUID()}`;
  }
}

export function CheckoutView() {
  const router = useRouter();
  const { status, data, lines, subtotal, currency, clear } = useShop();
  const [form, setForm] = useState<CheckoutForm>(readDraft);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const valid = lines.filter((l) => l.available);
  const invalid = lines.filter((l) => !l.available);

  // Guarda el borrador para no perder lo escrito si se recarga la página.
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch { /* almacenamiento no disponible */ }
  }, [form]);

  const methods = useMemo(
    () => (data ? (Object.entries(data.store.paymentMethods).filter(([, on]) => on).map(([m]) => m)) : []),
    [data],
  );
  // Con un único método habilitado, queda elegido sin que el cliente tenga que marcarlo.
  const paymentMethod = form.paymentMethod || (methods.length === 1 ? methods[0] : "");

  const zone = data ? zoneFor(data.shippingZones, form["shipping.country"], form["shipping.department"]) : null;
  const shipping = zone
    ? zone.freeOver !== null && subtotal >= toNumber(zone.freeOver) ? 0 : toNumber(zone.price)
    : null;
  const total = shipping === null ? null : subtotal + shipping;
  const countries = data?.store.allowedCountries ?? ["HN"];

  const set = (key: keyof CheckoutForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const found = validateCheckout({ ...form, paymentMethod });
    if (!valid.length) found.items = "Tu carrito está vacío.";
    if (invalid.length) found.items = "Quita los productos no disponibles de tu carrito.";
    if (form["shipping.department"] && !zone) found["shipping.department"] = "Todavía no hacemos envíos a este departamento.";
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>("[aria-invalid='true'], .checkout-alert");
        first?.focus();
        first?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }

    setSubmitting(true);
    const items = valid.map((l) => ({ variantId: l.variantId, fragranceId: l.fragranceId, quantity: l.quantity }));
    const signature = JSON.stringify([items, { ...form, paymentMethod }]);
    try {
      const result = await shopApi.checkout({
        idempotencyKey: idempotencyKey(signature),
        paymentMethod,
        customer: {
          full_name: form["customer.full_name"], phone: form["customer.phone"], email: form["customer.email"],
        },
        shipping: {
          country: form["shipping.country"], department: form["shipping.department"], city: form["shipping.city"],
          neighborhood: form["shipping.neighborhood"], address: form["shipping.address"], reference: form["shipping.reference"],
          recipient_name: form.otherRecipient ? form["shipping.recipient_name"] : "",
          phone: form.otherRecipient ? form["shipping.phone"] : "",
          alt_phone: form["shipping.alt_phone"], instructions: form["shipping.instructions"],
        },
        items,
      });
      try {
        sessionStorage.removeItem(IDEM_KEY);
        sessionStorage.removeItem(DRAFT_KEY);
        if (result.payment) sessionStorage.setItem(`aromatic-pay:${result.orderNumber}`, JSON.stringify(result.payment));
      } catch { /* sin almacenamiento */ }
      clear();
      router.push(`/pedido/?n=${encodeURIComponent(result.orderNumber)}&t=${encodeURIComponent(result.token)}`);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, "error", "Ocurrió un error. Inténtalo de nuevo.");
      const field = apiErr.field && apiErr.field in EMPTY ? (apiErr.field as keyof CheckoutForm) : null;
      setErrors(field ? { [field]: apiErr.message } : { form: apiErr.message });
      setSubmitting(false);
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  if (status === "loading") {
    return <div className="frame pb-section pt-[calc(var(--nav-h)+3rem)]"><p className="text-body text-warm-gray">Cargando…</p></div>;
  }
  if (status !== "open") {
    return (
      <div className="frame pb-section pt-[calc(var(--nav-h)+3rem)]">
        <h1 className="serif text-heading">Pago</h1>
        <p className="mt-5 max-w-[40ch] text-lede text-warm-gray">
          {status === "error" ? "No pudimos cargar la tienda. Inténtalo de nuevo en unos minutos." : "La tienda en línea no está recibiendo pedidos en este momento."}
        </p>
        <Link href="/" className="btn btn-line mt-8">Volver al inicio</Link>
      </div>
    );
  }
  if (!lines.length) {
    return (
      <div className="frame pb-section pt-[calc(var(--nav-h)+3rem)]">
        <h1 className="serif text-heading">Tu carrito está vacío</h1>
        <Link href="/tienda/" className="btn btn-solid mt-8">Ver productos</Link>
      </div>
    );
  }

  const err = (k: keyof CheckoutForm) => errors[k];

  return (
    <div className="frame pb-section pt-[calc(var(--nav-h)+2rem)]">
      <TestModeBanner />
      <h1 className="serif text-heading">Finalizar compra</h1>

      <form className="checkout-grid mt-10" onSubmit={submit} noValidate>
        <div className="checkout-main">
          {errors.form || errors.items ? (
            <div ref={errorRef} tabIndex={-1} className="checkout-alert" role="alert">
              {errors.form ?? errors.items}
            </div>
          ) : null}

          <fieldset className="checkout-section">
            <legend className="checkout-legend">Tus datos</legend>
            <TextField id="co-name" label="Nombre completo" autoComplete="name" value={form["customer.full_name"]}
              onChange={set("customer.full_name")} error={err("customer.full_name")} maxLength={120} />
            <div className="form-row">
              <TextField id="co-phone" label="Teléfono" type="tel" inputMode="tel" autoComplete="tel" placeholder="9999-9999"
                value={form["customer.phone"]} onChange={set("customer.phone")} error={err("customer.phone")} hint="Te llamaremos o escribiremos por WhatsApp si hace falta." />
              <TextField id="co-email" label="Correo electrónico" type="email" autoComplete="email" inputMode="email"
                value={form["customer.email"]} onChange={set("customer.email")} error={err("customer.email")} maxLength={254} />
            </div>
          </fieldset>

          <fieldset className="checkout-section">
            <legend className="checkout-legend">Dirección de entrega</legend>
            <div className="form-row">
              <SelectField id="co-country" label="País" value={form["shipping.country"]} onChange={set("shipping.country")} autoComplete="country">
                {countries.map((c) => <option key={c} value={c}>{COUNTRY_NAMES[c] ?? c}</option>)}
              </SelectField>
              <SelectField id="co-dep" label="Departamento" value={form["shipping.department"]} onChange={set("shipping.department")}
                error={err("shipping.department")} autoComplete="address-level1">
                <option value="">Elige…</option>
                {HN_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </SelectField>
            </div>
            <div className="form-row">
              <TextField id="co-city" label="Ciudad o municipio" autoComplete="address-level2" value={form["shipping.city"]}
                onChange={set("shipping.city")} error={err("shipping.city")} maxLength={80} />
              <TextField id="co-neigh" label="Colonia, barrio o aldea" value={form["shipping.neighborhood"]}
                onChange={set("shipping.neighborhood")} error={err("shipping.neighborhood")} maxLength={120} />
            </div>
            <TextField id="co-address" label="Dirección completa" autoComplete="street-address" placeholder="Calle, avenida, bloque, número de casa"
              value={form["shipping.address"]} onChange={set("shipping.address")} error={err("shipping.address")} maxLength={300} />
            <TextArea id="co-ref" label="Referencias para encontrar la dirección" placeholder="Color del portón, negocio cercano, punto conocido"
              value={form["shipping.reference"]} onChange={set("shipping.reference")} error={err("shipping.reference")} maxLength={300} />

            <label className="form-check">
              <input type="checkbox" checked={form.otherRecipient} onChange={set("otherRecipient")} />
              Otra persona recibirá el pedido
            </label>
            {form.otherRecipient ? (
              <div className="form-row">
                <TextField id="co-rname" label="Nombre de quien recibe" value={form["shipping.recipient_name"]}
                  onChange={set("shipping.recipient_name")} error={err("shipping.recipient_name")} maxLength={120} />
                <TextField id="co-rphone" label="Teléfono de quien recibe" type="tel" inputMode="tel" optional
                  value={form["shipping.phone"]} onChange={set("shipping.phone")} error={err("shipping.phone")} />
              </div>
            ) : null}
            <TextField id="co-alt" label="Teléfono alternativo" type="tel" inputMode="tel" optional
              value={form["shipping.alt_phone"]} onChange={set("shipping.alt_phone")} error={err("shipping.alt_phone")} />
            <TextArea id="co-instr" label="Instrucciones especiales de entrega" optional maxLength={300}
              value={form["shipping.instructions"]} onChange={set("shipping.instructions")} error={err("shipping.instructions")}
              placeholder="Horario preferido, dejar con el vigilante…" />
          </fieldset>

          <fieldset className="checkout-section">
            <legend className="checkout-legend">Método de pago</legend>
            {methods.length === 0 ? <p className="text-body text-ink">No hay métodos de pago disponibles en este momento.</p> : null}
            <div className="pay-options" role="radiogroup" aria-describedby={errors.paymentMethod ? "co-pay-error" : undefined}>
              {methods.map((m) => (
                <label key={m} className="pay-option" data-selected={paymentMethod === m || undefined}>
                  <input type="radio" name="paymentMethod" value={m} checked={paymentMethod === m} onChange={set("paymentMethod")} />
                  <span>
                    <span className="block text-body font-medium text-charcoal">{PAYMENT_METHOD_LABELS[m]}</span>
                    <span className="mt-1 block text-small text-warm-gray">
                      {m === "cash_on_delivery" && data?.store.codInstructions ? data.store.codInstructions : METHOD_HELP[m]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {errors.paymentMethod ? <p id="co-pay-error" className="form-error" role="alert">{errors.paymentMethod}</p> : null}
          </fieldset>
        </div>

        <aside className="checkout-summary" aria-label="Resumen del pedido">
          <h2 className="checkout-legend">Resumen</h2>
          <ul className="summary-lines">
            {valid.map((l) => (
              <li key={l.key} className="summary-line">
                <ShopThumb slug={l.product?.slug} name={l.product?.name ?? ""} fragranceId={l.fragranceId}
                  imageUrl={l.variant?.imageUrl ?? l.product?.imageUrl} sizes="56px" />
                <span className="min-w-0">
                  <span className="block text-small font-medium text-charcoal">{l.quantity} × {l.product?.shortName}</span>
                  <span className="block text-small text-warm-gray">{[l.variant?.presentation, l.fragrance?.name].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="text-small tabular">{money(l.lineTotal, currency)}</span>
              </li>
            ))}
          </ul>
          {invalid.length ? <p className="mt-3 text-small text-alert">Hay productos no disponibles en tu carrito. Ajústalos desde el carrito.</p> : null}
          <dl className="summary-totals">
            <div><dt>Subtotal</dt><dd className="tabular">{money(subtotal, currency)}</dd></div>
            <div>
              <dt>Envío{zone?.estimatedDays ? <span className="block text-micro text-warm-gray">{zone.estimatedDays}</span> : null}</dt>
              <dd className="tabular">
                {!form["shipping.department"] ? "Elige el departamento" : shipping === null ? "No disponible" : shipping === 0 ? "Gratis" : money(shipping, currency)}
              </dd>
            </div>
            <div className="summary-total"><dt>Total</dt><dd className="tabular">{total === null ? "—" : money(total, currency)}</dd></div>
          </dl>
          {data?.store.pricesIncludeTax ? <p className="mt-2 text-micro text-warm-gray">Precios con impuestos incluidos. El total final lo confirma el servidor.</p> : null}
          <button type="submit" className="btn btn-solid mt-6 w-full" disabled={submitting} aria-busy={submitting}>
            {submitting ? "Procesando…" : paymentMethod === "card" ? "Continuar al pago con tarjeta" : "Confirmar pedido"}
          </button>
          <p className="mt-3 text-micro text-warm-gray">
            Al confirmar aceptas que usemos tus datos solo para entregar y dar seguimiento a tu pedido.
          </p>
        </aside>
      </form>
    </div>
  );
}
