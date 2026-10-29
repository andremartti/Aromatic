"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/config/shop";
import { site } from "@/config/site";
import { ApiError, shopApi, type PaymentSession, type PublicOrder } from "@/lib/shop/api";
import { money } from "@/lib/shop/money";
import { whatsappLink } from "@/lib/whatsapp";
import { CardPayment } from "./CardPayment";
import { TextField } from "./fields";
import { WhatsAppIcon } from "../icons";

/** /pedido/?n=AR-000123&t=<token> · confirmación, comprobante, pago y seguimiento. */
export function OrderView() {
  return (
    <Suspense fallback={<div className="frame pt-[calc(var(--nav-h)+3rem)] pb-section text-warm-gray">Cargando…</div>}>
      <OrderFromUrl />
    </Suspense>
  );
}

function OrderFromUrl() {
  const params = useSearchParams();
  const n = params.get("n");
  const t = params.get("t");
  if (!n || !t) return <Lookup />;
  return <OrderDetail orderNumber={n} token={t} />;
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("es-HN", { dateStyle: "long", timeStyle: "short", timeZone: "America/Tegucigalpa" }).format(new Date(iso));

function OrderDetail({ orderNumber, token }: { orderNumber: string; token: string }) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const { order } = await shopApi.order(orderNumber, token);
      setOrder(order);
      setError(null);
      return order;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cargar el pedido.");
      return null;
    }
  }, [orderNumber, token]);

  useEffect(() => {
    let alive = true;
    shopApi
      .order(orderNumber, token)
      .then(async ({ order: o }) => {
        if (!alive) return;
        setOrder(o);
        setError(null);
        if (!o.canPayAgain) return;
        try {
          const saved = sessionStorage.getItem(`aromatic-pay:${orderNumber}`);
          if (saved) return setSession(JSON.parse(saved));
        } catch { /* sin almacenamiento */ }
        try {
          const { payment } = await shopApi.startPayment(orderNumber, token);
          if (alive) setSession(payment);
        } catch (err) {
          if (alive) setError(err instanceof ApiError ? err.message : "No pudimos preparar el pago.");
        }
      })
      .catch((err) => {
        if (alive) setError(err instanceof ApiError ? err.message : "No pudimos cargar el pedido.");
      });
    return () => {
      alive = false;
    };
  }, [orderNumber, token]);

  // Mientras un pago está por confirmarse, se vuelve a consultar cada pocos segundos.
  useEffect(() => {
    if (!order || order.paymentMethod !== "card" || order.paymentStatus === "approved" || order.status !== "pending" || session) return;
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [order, session, load]);

  const afterPayment = useCallback(async () => {
    try {
      sessionStorage.removeItem(`aromatic-pay:${orderNumber}`);
    } catch { /* sin almacenamiento */ }
    const o = await load();
    if (o && !o.canPayAgain) setSession(null);
  }, [load, orderNumber]);

  if (error && !order) {
    return (
      <div className="frame pt-[calc(var(--nav-h)+3rem)] pb-section">
        <h1 className="serif text-heading">Pedido</h1>
        <p className="mt-5 text-lede text-warm-gray">{error}</p>
        <Link href="/pedido/" className="btn btn-line mt-8">Buscar un pedido</Link>
      </div>
    );
  }
  if (!order) return <div className="frame pt-[calc(var(--nav-h)+3rem)] pb-section text-warm-gray">Cargando tu pedido…</div>;

  const paid = order.paymentStatus === "approved";
  const headline =
    order.status === "cancelled" ? "Pedido cancelado"
      : paid ? "¡Gracias! Tu pedido está confirmado"
        : order.paymentMethod === "card" ? "Completa el pago de tu pedido"
          : "Recibimos tu pedido";
  const link = typeof window === "undefined" ? "" : window.location.href;

  return (
    <div className="frame pt-[calc(var(--nav-h)+2rem)] pb-section">
      {order.isTest ? <div className="test-banner" role="note"><strong>Pedido de prueba.</strong> No se cobró dinero real.</div> : null}
      <div className="order-head">
        <div>
          <p className="eyebrow">Pedido {order.orderNumber}</p>
          <h1 className="serif mt-3 text-heading">{headline}</h1>
          <p className="mt-4 text-body text-warm-gray">{fmtDate(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="status-pill" data-tone={order.status === "cancelled" ? "bad" : paid ? "good" : "wait"}>{ORDER_STATUS_LABELS[order.status]}</span>
          <span className="status-pill" data-tone={paid ? "good" : order.paymentStatus === "declined" ? "bad" : "wait"}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</span>
        </div>
      </div>

      <div className="order-grid mt-10">
        <div className="grid gap-8">
          {order.canPayAgain && session ? (
            <CardPayment orderNumber={orderNumber} token={token} session={session} onSession={setSession} onDone={afterPayment} />
          ) : null}
          {error && order ? <div className="checkout-alert" role="alert">{error}</div> : null}

          {order.transferInstructions ? <TransferBox order={order} token={token} onUpdate={setOrder} /> : null}
          {order.paymentStatus === "awaiting_verification" ? (
            <p className="pay-box text-body text-ink">Recibimos el aviso de tu transferencia. Te confirmaremos cuando la verifiquemos.</p>
          ) : null}
          {order.codInstructions && order.status !== "cancelled" ? (
            <div className="pay-box"><p className="eyebrow">Pago contra entrega</p><p className="mt-2 text-body text-ink whitespace-pre-line">{order.codInstructions}</p></div>
          ) : order.paymentMethod === "cash_on_delivery" && order.status === "pending" ? (
            <p className="pay-box text-body text-ink">Pagarás al recibir. Te contactaremos para confirmar tu pedido.</p>
          ) : null}

          {order.shipment ? (
            <div className="pay-box">
              <p className="eyebrow">Envío</p>
              <p className="mt-2 text-body text-ink">{order.shipment.carrier}{order.shipment.tracking ? ` · Guía ${order.shipment.tracking}` : ""}</p>
              {order.shipment.trackingUrl ? (
                <a href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-link mt-2">Rastrear envío</a>
              ) : null}
            </div>
          ) : null}

          <section className="receipt" aria-labelledby="receipt-title">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="receipt-title" className="serif text-title">Comprobante</h2>
              <button type="button" className="text-link no-print" onClick={() => window.print()}>Imprimir</button>
            </div>
            <p className="mt-1 text-small text-warm-gray">{site.name} · Pedido {order.orderNumber} · {fmtDate(order.createdAt)}</p>
            <table className="receipt-table mt-5">
              <thead><tr><th scope="col">Producto</th><th scope="col" className="num">Cant.</th><th scope="col" className="num">Precio</th><th scope="col" className="num">Total</th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={`${i.sku}-${i.fragrance}`}>
                    <td>{i.name}<span className="block text-micro text-warm-gray">{[i.presentation, i.fragrance].filter(Boolean).join(" · ")} · {i.sku}</span></td>
                    <td className="num tabular">{i.quantity}</td>
                    <td className="num tabular">{money(i.unitPrice, order.currency)}</td>
                    <td className="num tabular">{money(i.lineTotal, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3}>Subtotal</td><td className="num tabular">{money(order.subtotal, order.currency)}</td></tr>
                {Number(order.discount) > 0 ? <tr><td colSpan={3}>Descuento</td><td className="num tabular">−{money(order.discount, order.currency)}</td></tr> : null}
                <tr><td colSpan={3}>Envío</td><td className="num tabular">{Number(order.shippingCost) === 0 ? "Gratis" : money(order.shippingCost, order.currency)}</td></tr>
                <tr className="receipt-total"><td colSpan={3}>Total</td><td className="num tabular">{money(order.total, order.currency)}</td></tr>
              </tfoot>
            </table>
            <dl className="receipt-meta mt-6">
              <div><dt>Método de pago</dt><dd>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</dd></div>
              <div><dt>Estado del pago</dt><dd>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</dd></div>
              <div>
                <dt>Entrega</dt>
                <dd>
                  {order.shipping.recipientName ? <>{order.shipping.recipientName}<br /></> : null}
                  {[order.shipping.address, order.shipping.neighborhood].filter(Boolean).join(", ")}
                  {order.shipping.address ? <br /> : null}
                  {[order.shipping.city, order.shipping.department].filter(Boolean).join(", ")}
                  {order.shipping.estimate ? <span className="block text-small text-warm-gray">Tiempo estimado: {order.shipping.estimate}</span> : null}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="grid content-start gap-6 no-print">
          <div className="pay-box">
            <p className="eyebrow">Guarda este enlace</p>
            <p className="mt-2 text-small text-warm-gray">Con él puedes consultar el estado de tu pedido cuando quieras. No lo compartas.</p>
            <button type="button" className="btn btn-line mt-4 w-full" onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              } catch { /* sin portapapeles */ }
            }}>{copied ? "Enlace copiado" : "Copiar enlace"}</button>
          </div>
          <a className="btn btn-sage w-full" target="_blank" rel="noopener noreferrer"
            href={whatsappLink(`Hola ${site.name}, tengo una consulta sobre mi pedido ${order.orderNumber}.`)}>
            <WhatsAppIcon className="size-5" />
            Consultar por WhatsApp
          </a>
          {order.timeline?.length ? (
            <div className="pay-box">
              <p className="eyebrow">Historial</p>
              <ol className="timeline mt-3">
                {order.timeline.map((e, i) => (
                  <li key={i}>
                    <span className="text-small text-ink">
                      {e.kind === "created" ? "Pedido recibido" : e.kind === "payment" ? PAYMENT_STATUS_LABELS[e.to ?? ""] ?? e.to : ORDER_STATUS_LABELS[e.to ?? ""] ?? e.to}
                    </span>
                    <span className="block text-micro text-warm-gray">{fmtDate(e.at)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function TransferBox({ order, token, onUpdate }: { order: PublicOrder; token: string; onUpdate: (o: PublicOrder) => void }) {
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  return (
    <div className="pay-box">
      <p className="eyebrow">Paga por transferencia</p>
      <p className="mt-2 text-small text-warm-gray">Transfiere {money(order.total, order.currency)} con el número de pedido {order.orderNumber} en la descripción:</p>
      <p className="mt-3 whitespace-pre-line text-body text-charcoal">{order.transferInstructions}</p>
      {order.canReportTransfer ? (
        <form className="mt-5 grid gap-3" onSubmit={async (e) => {
          e.preventDefault();
          if (reference.trim().length < 3) return setError("Escribe el número de referencia de la transferencia.");
          setSending(true);
          try {
            onUpdate((await shopApi.reportTransfer(order.orderNumber, token, reference)).order);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No pudimos enviar el aviso.");
          } finally {
            setSending(false);
          }
        }}>
          <TextField id="tr-ref" label="¿Ya transferiste? Escribe la referencia" value={reference}
            onChange={(e) => { setReference(e.target.value); setError(undefined); }} error={error} maxLength={80} />
          <button type="submit" className="btn btn-line" disabled={sending}>{sending ? "Enviando…" : "Avisar que ya transferí"}</button>
        </form>
      ) : null}
    </div>
  );
}

function Lookup() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="frame pt-[calc(var(--nav-h)+2.5rem)] pb-section">
      <h1 className="serif text-heading">Consulta tu pedido</h1>
      <p className="mt-5 max-w-[44ch] text-lede text-warm-gray">Escribe tu número de pedido y el teléfono con el que compraste. También puedes usar el enlace de tu confirmación.</p>
      <form className="mt-10 grid max-w-[34rem] gap-5" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          setOrder((await shopApi.lookup(orderNumber.trim().toUpperCase(), phone)).order);
        } catch (err) {
          setOrder(null);
          setError(err instanceof ApiError ? err.message : "No pudimos consultar el pedido.");
        } finally {
          setBusy(false);
        }
      }}>
        <TextField id="lk-n" label="Número de pedido" placeholder="AR-000123" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} autoCapitalize="characters" />
        <TextField id="lk-p" label="Teléfono" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {error ? <div className="checkout-alert" role="alert">{error}</div> : null}
        <button type="submit" className="btn btn-solid" disabled={busy}>{busy ? "Buscando…" : "Consultar"}</button>
      </form>
      {order ? (
        <div className="pay-box mt-10 max-w-[34rem]" role="status">
          <p className="eyebrow">Pedido {order.orderNumber}</p>
          <p className="serif mt-2 text-title">{ORDER_STATUS_LABELS[order.status]}</p>
          <p className="mt-1 text-body text-ink">{PAYMENT_STATUS_LABELS[order.paymentStatus]} · {money(order.total, order.currency)}</p>
          {order.shipment?.tracking ? <p className="mt-2 text-small text-ink">{order.shipment.carrier} · Guía {order.shipment.tracking}</p> : null}
          {order.shipment?.trackingUrl ? <a href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-link mt-2">Rastrear envío</a> : null}
          <p className="mt-3 text-small text-warm-gray">Envío a {order.shipping.city}, {order.shipping.department}.</p>
        </div>
      ) : null}
    </div>
  );
}
