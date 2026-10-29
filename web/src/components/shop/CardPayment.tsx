"use client";

import { useState } from "react";
import { ApiError, shopApi, type PaymentSession, type PixelPaySession } from "@/lib/shop/api";
import { money } from "@/lib/shop/money";
import { TextField } from "./fields";

interface CardPaymentProps {
  orderNumber: string;
  token: string;
  session: PaymentSession;
  onSession: (s: PaymentSession) => void;
  onDone: () => void;
}

type Phase = { kind: "idle" } | { kind: "processing" } | { kind: "declined"; message: string } | { kind: "error"; message: string } | { kind: "pending" };

const digits = (v: string) => v.replace(/\D/g, "");

/** Algoritmo de Luhn: detecta errores de tipeo antes de enviar a la pasarela. */
function luhn(num: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return num.length >= 13 && sum % 10 === 0;
}

/**
 * Pago con tarjeta. Los datos de la tarjeta se envían desde este navegador
 * directamente a PixelPay con su SDK oficial; nunca llegan a los servidores de
 * AROMATIC ni se guardan. Después, el servidor consulta a PixelPay para
 * confirmar el resultado real antes de marcar el pedido como pagado.
 */
export function CardPayment({ orderNumber, token, session, onSession, onDone }: CardPaymentProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  async function retry() {
    try {
      const { payment } = await shopApi.startPayment(orderNumber, token);
      onSession(payment);
      setPhase({ kind: "idle" });
    } catch (err) {
      setPhase({ kind: "error", message: err instanceof ApiError ? err.message : "No pudimos preparar un nuevo intento." });
    }
  }

  async function confirm(providerPaymentId: string) {
    const { result } = await shopApi.confirmPayment(orderNumber, token, session.paymentId, providerPaymentId);
    const outcome = (result as { outcome?: string }).outcome;
    if (outcome === "approved" || outcome === "already_approved" || (result as { duplicate?: boolean }).duplicate) return onDone();
    if (outcome === "declined" || outcome === "cancelled") {
      setPhase({ kind: "declined", message: "El banco rechazó el pago. Puedes intentar con otra tarjeta." });
      return;
    }
    if (outcome === "amount_mismatch") {
      setPhase({ kind: "error", message: "No pudimos validar el monto del pago. Nuestro equipo lo revisará y te contactará." });
      return onDone();
    }
    setPhase({ kind: "pending" });
    onDone();
  }

  if (session.provider === "simulated") {
    return (
      <div className="pay-box">
        <p className="eyebrow">Simulador de pagos · modo de pruebas</p>
        <p className="mt-2 text-small text-warm-gray">No se usa ninguna tarjeta ni se cobra dinero. Elige el resultado que quieres probar.</p>
        <p className="serif mt-4 text-title tabular">{money(session.amount, session.currency)}</p>
        {phase.kind === "declined" || phase.kind === "error" ? <p className="form-error mt-3" role="alert">{phase.message}</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn btn-solid" disabled={phase.kind === "processing"} onClick={async () => {
            setPhase({ kind: "processing" });
            try {
              await shopApi.simulatePayment(orderNumber, token, session.paymentId, "approved");
              onDone();
            } catch (err) {
              setPhase({ kind: "error", message: err instanceof ApiError ? err.message : "Error del simulador." });
            }
          }}>Simular pago aprobado</button>
          <button type="button" className="btn btn-line" disabled={phase.kind === "processing"} onClick={async () => {
            setPhase({ kind: "processing" });
            try {
              await shopApi.simulatePayment(orderNumber, token, session.paymentId, "declined");
              setPhase({ kind: "declined", message: "Rechazo simulado. Puedes volver a intentarlo." });
              await retry();
            } catch (err) {
              setPhase({ kind: "error", message: err instanceof ApiError ? err.message : "Error del simulador." });
            }
          }}>Simular rechazo</button>
        </div>
      </div>
    );
  }

  return <PixelPayForm session={session} phase={phase} setPhase={setPhase} confirm={confirm} retry={retry} />;
}

function PixelPayForm({ session, phase, setPhase, confirm, retry }: {
  session: PixelPaySession;
  phase: Phase;
  setPhase: (p: Phase) => void;
  confirm: (id: string) => Promise<void>;
  retry: () => Promise<void>;
}) {
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    const n = digits(number);
    if (!luhn(n) || n.length > 19) e.number = "Revisa el número de la tarjeta.";
    if (holder.trim().length < 3) e.holder = "Escribe el nombre como aparece en la tarjeta.";
    const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry.trim());
    const month = m ? Number(m[1]) : 0;
    const year = m ? 2000 + Number(m[2]) : 0;
    const now = new Date();
    if (!m || month < 1 || month > 12 || year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      e.expiry = "Escribe una fecha de vencimiento válida (MM/AA).";
    }
    if (!/^\d{3,4}$/.test(cvv)) e.cvv = "Escribe el código de seguridad (3 o 4 dígitos).";
    setErrors(e);
    return Object.keys(e).length ? null : { n, month, year };
  }

  async function pay(ev: React.FormEvent) {
    ev.preventDefault();
    if (phase.kind === "processing") return;
    const v = validate();
    if (!v) return;
    setPhase({ kind: "processing" });
    try {
      // Entrada CommonJS del SDK oficial (su paquete "browser" es un UMD que los empaquetadores no resuelven).
      const sdk = await import("@pixelpay/sdk-core/lib/index.js");
      const { Models, Requests, Services } = sdk;
      const settings = new Models.Settings();
      settings.setupEndpoint(session.pixelpay.endpoint);
      settings.setupCredentials(session.pixelpay.keyId, session.pixelpay.keyHash);
      if (session.pixelpay.environment) settings.setupEnvironment(session.pixelpay.environment);
      settings.setupLanguage("es");

      const card = new Models.Card();
      card.number = v.n;
      card.cvv2 = cvv;
      card.expire_month = v.month;
      card.expire_year = v.year;
      card.cardholder = holder.trim();

      const billing = new Models.Billing();
      billing.address = session.billing.address;
      billing.country = session.billing.country;
      billing.state = session.billing.state;
      billing.city = session.billing.city;
      billing.phone = session.billing.phone;

      const order = new Models.Order();
      order.id = session.orderRef;
      order.currency = session.currency;
      order.customer_name = session.customer.name;
      order.customer_email = session.customer.email ?? undefined;
      order.callback_url = session.callbackUrl;
      for (const i of session.items) {
        const item = new Models.Item();
        item.code = i.code;
        item.title = i.title;
        item.price = Number(i.price);
        item.qty = i.qty;
        order.addItem(item);
      }
      // El monto lo fijó el servidor (incluye envío) y el servidor lo vuelve a verificar con PixelPay.
      order.amount = Number(session.amount);

      const sale = new Requests.SaleTransaction();
      sale.setOrder(order);
      sale.setCard(card);
      sale.setBilling(billing);
      // 3-D Secure (si el servidor lo pide): el SDK muestra el reto del banco en esta misma página.
      if (session.pixelpay.authentication) sale.withAuthenticationRequest();

      const response = await new Services.Transaction(settings).doSale(sale);
      setCvv("");
      const uuid = (response?.data as { payment_uuid?: string } | undefined)?.payment_uuid;
      if (uuid) return await confirm(uuid);
      setPhase({ kind: "declined", message: response?.message || "No se pudo procesar el pago. Revisa los datos e inténtalo de nuevo." });
    } catch (err) {
      setCvv("");
      setPhase({ kind: "error", message: err instanceof ApiError ? err.message : "No se pudo conectar con PixelPay. Inténtalo de nuevo." });
    }
  }

  const busy = phase.kind === "processing";
  return (
    <form className="pay-box" onSubmit={pay} noValidate autoComplete="on">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="eyebrow">Pago con tarjeta</p>
        <p className="serif text-title tabular">{money(session.amount, session.currency)}</p>
      </div>
      {session.mode === "test" ? (
        <p className="mt-2 text-small text-ink">Sandbox de PixelPay: usa solo tarjetas de prueba. No se cobra dinero real.</p>
      ) : null}
      <div className="mt-5 grid gap-4">
        <TextField id="cc-number" label="Número de tarjeta" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"
          value={number} onChange={(e) => setNumber(digits(e.target.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "))} error={errors.number} />
        <TextField id="cc-name" label="Nombre en la tarjeta" autoComplete="cc-name" value={holder}
          onChange={(e) => setHolder(e.target.value)} error={errors.holder} maxLength={60} />
        <div className="form-row">
          <TextField id="cc-exp" label="Vencimiento" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={expiry}
            onChange={(e) => {
              const d = digits(e.target.value).slice(0, 4);
              setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
            }} error={errors.expiry} />
          <TextField id="cc-cvv" label="Código de seguridad" inputMode="numeric" autoComplete="cc-csc" type="password" value={cvv}
            onChange={(e) => setCvv(digits(e.target.value).slice(0, 4))} error={errors.cvv} />
        </div>
      </div>
      {phase.kind === "declined" || phase.kind === "error" ? (
        <div className="checkout-alert mt-5" role="alert">
          {phase.message}
          {phase.kind === "declined" ? (
            <button type="button" className="text-link mt-2 flex" onClick={retry}>Intentar de nuevo</button>
          ) : null}
        </div>
      ) : null}
      {phase.kind === "pending" ? (
        <p className="mt-5 text-small text-ink" role="status">Estamos confirmando el pago con PixelPay. Esta página se actualizará.</p>
      ) : null}
      <button type="submit" className="btn btn-solid mt-6 w-full" disabled={busy || phase.kind === "declined"} aria-busy={busy}>
        {busy ? "Procesando pago…" : `Pagar ${money(session.amount, session.currency)}`}
      </button>
      <p className="mt-3 text-micro text-warm-gray">
        Procesado por PixelPay. AROMATIC no recibe ni guarda los datos de tu tarjeta.
      </p>
    </form>
  );
}
