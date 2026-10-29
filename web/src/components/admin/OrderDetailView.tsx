"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/config/shop";
import { money } from "@/lib/shop/money";
import { SelectField, TextArea, TextField } from "../shop/fields";
import { useAdmin } from "./AdminProvider";
import {
  CopyButton, ErrorNote, OrderStatus, PageHead, Panel, PaymentStatus, Pill, SkeletonRows,
  errorMessage, fmtDateTime, fmtPhone, methodLabel, useAdminData, useToast, waLink,
} from "./ui";

interface OrderDetail {
  order: {
    id: string; order_number: string; created_at: string; status: string; payment_method: string; payment_status: string;
    is_test: boolean; needs_review: boolean; review_reason: string | null; currency: string;
    subtotal: number; discount: number; shipping_cost: number; total: number; item_count: number;
    customer_id: string; customer_name: string; customer_phone: string; customer_email: string | null;
    ship_recipient_name: string; ship_phone: string; ship_alt_phone: string | null; ship_country: string; ship_department: string;
    ship_city: string; ship_neighborhood: string | null; ship_address: string; ship_reference: string | null;
    delivery_instructions: string | null; shipping_zone_name: string | null; shipping_estimate: string | null;
    paid_at: string | null; confirmed_at: string | null; shipped_at: string | null; delivered_at: string | null; cancelled_at: string | null;
  };
  items: { id: string; sku: string; product_name: string; presentation: string; fragrance: string | null; unit_price: number; quantity: number; line_total: number }[];
  payments: {
    id: string; provider: string; method: string; status: string; attempt: number; amount: number; currency: string;
    reference: string | null; providerOrderRef: string | null; providerPaymentId: string | null; responseCode: string | null;
    responseMessage: string | null; createdAt: string; approvedAt: string | null; raw?: unknown;
  }[];
  shipment: {
    carrier_id: string | null; carrier_name: string | null; tracking_number: string | null; packages: number; weight_kg: number | null;
    declared_value: number | null; contents: string | null; handling_notes: string | null; guide_number: string | null; print_count: number;
    last_printed_at: string | null;
  } | null;
  events: { id: number; kind: string; from_value: string | null; to_value: string | null; note: string | null; actor_label: string | null; created_at: string }[];
  customer: { id: string; fullName: string; phone: string; email: string | null; orders: number } | null;
  allowedStatuses: string[];
}

type Carrier = { id: string; name: string; is_active: boolean; tracking_url: string | null };

export function OrderDetailView() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <OrderDetail />
    </Suspense>
  );
}

function OrderDetail() {
  const id = useSearchParams().get("id") ?? "";
  const valid = /^[0-9a-f-]{36}$/.test(id);
  const detail = useAdminData<OrderDetail>(valid ? "admin_get_order" : null, { id });
  const settings = useAdminData<{ carriers: Carrier[] }>("admin_get_settings");

  if (!valid) return <ErrorNote message="Falta el pedido. Ábrelo desde el listado de pedidos." />;
  if (detail.error && !detail.data) return <ErrorNote message={detail.error} onRetry={detail.reload} />;
  if (!detail.data) return <SkeletonRows rows={8} />;
  return <OrderBody d={detail.data} setData={detail.setData} carriers={settings.data?.carriers ?? []} />;
}

const EVENT_LABELS: Record<string, string> = {
  created: "Pedido recibido", status: "Estado", payment: "Pago", note: "Nota", shipment: "Envío",
  guide: "Guía impresa", review: "Revisión", stock: "Inventario", transfer: "Transferencia reportada",
};

function eventText(e: OrderDetail["events"][number]): string {
  const label = (v: string | null) => (v ? ORDER_STATUS_LABELS[v] ?? PAYMENT_STATUS_LABELS[v] ?? v : "");
  if (e.kind === "status" || e.kind === "payment") {
    return `${EVENT_LABELS[e.kind]}: ${e.from_value ? `${label(e.from_value)} → ` : ""}${label(e.to_value)}`;
  }
  if (e.kind === "shipment") return `Envío: ${e.to_value || "sin transportista"}`;
  if (e.kind === "guide") return `Guía ${e.to_value ?? ""}`;
  if (e.kind === "review") return e.to_value === "resuelta" ? "Revisión resuelta" : "Requiere revisión";
  return EVENT_LABELS[e.kind] ?? e.kind;
}

function OrderBody({ d, setData, carriers }: { d: OrderDetail; setData: (d: OrderDetail) => void; carriers: Carrier[] }) {
  const o = d.order;
  const address = [
    o.ship_recipient_name,
    o.ship_address,
    o.ship_neighborhood,
    `${o.ship_city}, ${o.ship_department}, ${o.ship_country}`,
    o.ship_reference ? `Ref.: ${o.ship_reference}` : null,
    `Tel. ${fmtPhone(o.ship_phone)}${o.ship_alt_phone ? ` / ${fmtPhone(o.ship_alt_phone)}` : ""}`,
  ].filter(Boolean).join("\n");
  const carrier = carriers.find((c) => c.id === d.shipment?.carrier_id);
  const trackingUrl = carrier?.tracking_url && d.shipment?.tracking_number
    ? carrier.tracking_url.replace("{tracking}", encodeURIComponent(d.shipment.tracking_number))
    : null;

  return (
    <>
      <PageHead
        back={{ href: "/admin/pedidos/", label: "Pedidos" }}
        title={o.order_number}
        meta={
          <>
            <span>{fmtDateTime(o.created_at)}</span>
            <OrderStatus value={o.status} />
            <PaymentStatus value={o.payment_status} />
            {o.is_test ? <Pill tone="warn">Prueba</Pill> : null}
          </>
        }
      >
        <Link href={`/admin/guias/?ids=${o.id}`} className="admin-btn admin-btn-solid" aria-disabled={o.status === "pending" || o.status === "cancelled"}
          onClick={(e) => { if (o.status === "pending" || o.status === "cancelled") e.preventDefault(); }}
          title={o.status === "pending" || o.status === "cancelled" ? "Confirma el pedido para generar la guía" : undefined}>
          Generar guía de envío
        </Link>
      </PageHead>

      {o.needs_review ? <ReviewAlert d={d} setData={setData} /> : null}

      <div className="admin-cols admin-cols-flow">
        <div className="admin-stack">
          <Panel title="Productos" className="admin-panel-flush">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th scope="col">Producto</th><th scope="col">SKU</th><th scope="col" className="num">Precio</th><th scope="col" className="num">Cant.</th><th scope="col" className="num">Importe</th></tr>
                </thead>
                <tbody>
                  {d.items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.product_name}<span className="admin-sub">{i.presentation}{i.fragrance ? ` · ${i.fragrance}` : ""}</span></td>
                      <td className="admin-mono">{i.sku}</td>
                      <td className="num">{money(i.unit_price, o.currency)}</td>
                      <td className="num">{i.quantity}</td>
                      <td className="num">{money(i.line_total, o.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-totals px-5 pb-5">
              <div><span>Subtotal</span><span>{money(o.subtotal, o.currency)}</span></div>
              {Number(o.discount) > 0 ? <div><span>Descuento</span><span>−{money(o.discount, o.currency)}</span></div> : null}
              <div><span>Envío{o.shipping_zone_name ? ` · ${o.shipping_zone_name}` : ""}</span><span>{Number(o.shipping_cost) ? money(o.shipping_cost, o.currency) : "Gratis"}</span></div>
              <div className="admin-total"><span>Total</span><span>{money(o.total, o.currency)}</span></div>
            </div>
          </Panel>

          <Panel title="Cliente y entrega" actions={<CopyButton text={address} label="Copiar dirección" done="Dirección copiada" />}>
            <dl className="admin-dl admin-dl-2">
              <div>
                <dt>Cliente</dt>
                <dd>
                  {d.customer ? <Link href={`/admin/cliente/?id=${d.customer.id}`} className="admin-row-link">{o.customer_name}</Link> : o.customer_name}
                  <span className="admin-sub">{o.customer_email ?? "Sin correo"}</span>
                </dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd className="flex flex-wrap items-center gap-x-3">
                  <a href={`tel:${o.customer_phone}`} className="tabular">{fmtPhone(o.customer_phone)}</a>
                  <a href={waLink(o.customer_phone)} target="_blank" rel="noopener" className="admin-btn admin-btn-quiet">WhatsApp</a>
                </dd>
              </div>
              <div>
                <dt>Recibe</dt>
                <dd>
                  {o.ship_recipient_name}
                  <span className="admin-sub tabular">{fmtPhone(o.ship_phone)}{o.ship_alt_phone ? ` · alterno ${fmtPhone(o.ship_alt_phone)}` : ""}</span>
                </dd>
              </div>
              <div>
                <dt>Dirección</dt>
                <dd>
                  {o.ship_address}{o.ship_neighborhood ? `, ${o.ship_neighborhood}` : ""}
                  <span className="admin-sub">{o.ship_city}, {o.ship_department}, {o.ship_country}</span>
                </dd>
              </div>
              {o.ship_reference ? <div><dt>Referencias</dt><dd>{o.ship_reference}</dd></div> : null}
              {o.delivery_instructions ? <div><dt>Instrucciones</dt><dd>{o.delivery_instructions}</dd></div> : null}
              {o.shipping_estimate ? <div><dt>Plazo ofrecido</dt><dd>{o.shipping_estimate}</dd></div> : null}
            </dl>
          </Panel>

          <PaymentsPanel d={d} setData={setData} />

          <Panel title="Historial" className="admin-order-history">
            <NoteForm orderId={o.id} setData={setData} />
            <ol className="admin-timeline mt-5">
              {[...d.events].reverse().map((e) => (
                <li key={e.id} className="admin-event">
                  <span>{eventText(e)}</span>
                  {e.note ? <span className="text-ink">{e.note}</span> : null}
                  <span className="admin-event-meta">{fmtDateTime(e.created_at)} · {e.actor_label ?? "Sistema"}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="admin-stack">
          <StatusPanel d={d} setData={setData} />
          <ShipmentPanel key={JSON.stringify(d.shipment)} d={d} setData={setData} carriers={carriers} trackingUrl={trackingUrl} />
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
 *  Acciones con confirmación en línea (sin ventanas modales).
 * ------------------------------------------------------------------------- */
function useAction(setData: (d: OrderDetail) => void) {
  const { call } = useAdmin();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: string, args: Record<string, unknown>, ok: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      setData(await call<OrderDetail>(fn, args));
      notify(ok);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error, setError };
}

const NEXT_LABEL: Record<string, string> = {
  confirmed: "Confirmar pedido", preparing: "Pasar a preparación", ready_to_ship: "Listo para enviar",
  shipped: "Marcar como enviado", delivered: "Marcar como entregado", cancelled: "Cancelar pedido", returned: "Registrar devolución",
};

function StatusPanel({ d, setData }: { d: OrderDetail; setData: (d: OrderDetail) => void }) {
  const o = d.order;
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { run, busy, error, setError } = useAction(setData);
  const needsPay = o.payment_status !== "approved" && o.payment_method !== "cash_on_delivery";
  const destructive = pick === "cancelled" || pick === "returned";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pick) return;
    if (destructive && !note.trim()) return setError("Escribe el motivo.");
    if (await run("admin_update_order_status", { id: o.id, status: pick, note: note.trim() || null }, `Pedido: ${ORDER_STATUS_LABELS[pick]}`)) {
      setPick(null);
      setNote("");
    }
  }

  return (
    <Panel title="Estado del pedido" className="admin-order-status">
      <p className="mb-4 flex flex-wrap items-center gap-2 text-small">
        Actual: <OrderStatus value={o.status} />
      </p>
      {d.allowedStatuses.length === 0 ? <p className="text-small text-warm-gray">No hay más cambios posibles para este pedido.</p> : null}
      {!pick ? (
        <div className="admin-actions">
          {d.allowedStatuses.map((s) => {
            const blocked = needsPay && ["confirmed", "preparing", "ready_to_ship", "shipped", "delivered"].includes(s);
            return (
              <button key={s} type="button" disabled={blocked}
                className={`admin-btn ${s === "cancelled" || s === "returned" ? "admin-btn-danger" : "admin-btn-line"}`}
                title={blocked ? "Primero se debe confirmar el pago" : undefined}
                onClick={() => { setPick(s); setError(null); }}>
                {NEXT_LABEL[s] ?? ORDER_STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      ) : (
        <form className="admin-choice" onSubmit={submit}>
          <p className="text-small font-medium text-charcoal">{NEXT_LABEL[pick]}</p>
          {pick === "cancelled" ? (
            <p className="text-[0.8125rem] text-ink">
              Se libera el inventario reservado.{o.payment_status === "approved" ? " El pago ya está aprobado: el pedido quedará en revisión hasta registrar el reembolso." : ""}
            </p>
          ) : null}
          <TextArea id="status-note" label={destructive ? "Motivo" : "Nota"} optional={!destructive} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="admin-actions">
            <button type="submit" className={`admin-btn ${destructive ? "admin-btn-danger" : "admin-btn-solid"}`} disabled={busy} aria-busy={busy}>
              {busy ? "Guardando…" : "Confirmar"}
            </button>
            <button type="button" className="admin-btn admin-btn-quiet" onClick={() => { setPick(null); setError(null); }}>Volver</button>
          </div>
        </form>
      )}
      {needsPay && o.status !== "cancelled" ? (
        <p className="mt-4 text-[0.8125rem] text-warm-gray">El pedido avanza cuando el pago esté confirmado.</p>
      ) : null}
    </Panel>
  );
}

type PayAction = { to: string; label: string; tone: "solid" | "line" | "danger"; reference?: "required" | "optional"; note?: "required" | "optional"; help?: string; role?: "admin" | "owner" };

function paymentActions(d: OrderDetail): PayAction[] {
  const o = d.order;
  const s = o.payment_status;
  const acts: PayAction[] = [];
  if (o.payment_method === "card") {
    if (s === "approved") acts.push({ to: "refunded", label: "Registrar reembolso", tone: "danger", note: "required", role: "admin", help: "Haz primero el reembolso en el panel de PixelPay; aquí solo queda registrado." });
    if (["pending", "declined"].includes(s)) {
      if (o.needs_review) acts.push({ to: "approved", label: "Aprobar tras verificar en PixelPay", tone: "solid", reference: "required", note: "required", role: "owner", help: "Solo si confirmaste el cobro y el monto exacto en el panel de PixelPay." });
      acts.push({ to: "cancelled", label: "Cancelar pago", tone: "line", note: "optional" });
    }
  } else if (o.payment_method === "bank_transfer") {
    if (["pending", "awaiting_verification", "declined"].includes(s)) acts.push({ to: "approved", label: "Transferencia verificada", tone: "solid", reference: "required", note: "optional", help: "Confirma en tu banca en línea que el dinero llegó y que el monto coincide." });
    if (["pending", "awaiting_verification"].includes(s)) {
      acts.push({ to: "declined", label: "No se recibió", tone: "line", note: "optional" });
      acts.push({ to: "cancelled", label: "Cancelar pago", tone: "line", note: "optional" });
    }
    if (s === "approved") acts.push({ to: "refunded", label: "Registrar reembolso", tone: "danger", note: "required", role: "admin" });
  } else {
    if (s === "pending") {
      acts.push({ to: "approved", label: "Marcar como cobrado", tone: "solid", reference: "optional", note: "optional", help: "Cuando la transportista o el repartidor entregue el efectivo." });
      acts.push({ to: "cancelled", label: "Cancelar cobro", tone: "line", note: "optional" });
    }
    if (s === "approved") acts.push({ to: "refunded", label: "Registrar reembolso", tone: "danger", note: "required", role: "admin" });
  }
  return acts;
}

function PaymentsPanel({ d, setData }: { d: OrderDetail; setData: (d: OrderDetail) => void }) {
  const o = d.order;
  const { can, call } = useAdmin();
  const notify = useToast();
  const [pick, setPick] = useState<PayAction | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [checking, setChecking] = useState(false);
  const { run, busy, error, setError } = useAction(setData);
  const acts = paymentActions(d).filter((a) => !a.role || can(a.role));
  const reported = d.payments.find((p) => p.reference)?.reference ?? "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pick) return;
    if (pick.reference === "required" && !reference.trim()) return setError("Escribe la referencia.");
    if (pick.note === "required" && !note.trim()) return setError("Escribe la nota.");
    if (await run("admin_update_payment_status", { id: o.id, status: pick.to, reference: reference.trim() || null, note: note.trim() || null }, `Pago: ${PAYMENT_STATUS_LABELS[pick.to]}`)) {
      setPick(null);
      setNote("");
    }
  }

  async function checkPixelPay() {
    setChecking(true);
    try {
      const res = await call<{ results: { outcome?: string }[]; order?: OrderDetail; message?: string }>("reconcile_order", { id: o.id });
      if (res.order) setData(res.order);
      notify(res.message ?? (res.results.length ? `PixelPay respondió: ${res.results.map((r) => r.outcome ?? "sin cambios").join(", ")}` : "No hay transacciones de PixelPay para consultar."));
    } catch (err) {
      notify(errorMessage(err), "bad");
    } finally {
      setChecking(false);
    }
  }

  return (
    <Panel
      title="Pago"
      actions={o.payment_method === "card" ? (
        <button type="button" className="admin-btn admin-btn-line" onClick={checkPixelPay} disabled={checking} aria-busy={checking}>
          {checking ? "Consultando…" : "Consultar en PixelPay"}
        </button>
      ) : null}
    >
      <p className="flex flex-wrap items-center gap-2 text-small">
        {methodLabel(o.payment_method)} · <PaymentStatus value={o.payment_status} />
        {o.paid_at ? <span className="text-warm-gray">Pagado el {fmtDateTime(o.paid_at)}</span> : null}
      </p>

      {acts.length ? (
        !pick ? (
          <div className="admin-actions mt-4">
            {acts.map((a) => (
              <button key={a.to + a.label} type="button" className={`admin-btn admin-btn-${a.tone}`}
                onClick={() => { setPick(a); setError(null); setReference(a.to === "approved" ? reported : ""); }}>
                {a.label}
              </button>
            ))}
          </div>
        ) : (
          <form className="admin-choice mt-4" onSubmit={submit}>
            <p className="text-small font-medium text-charcoal">{pick.label}</p>
            {pick.help ? <p className="text-[0.8125rem] text-ink">{pick.help}</p> : null}
            {pick.reference ? (
              <TextField id="pay-ref" label={o.payment_method === "bank_transfer" ? "Referencia de la transferencia" : "Referencia"} optional={pick.reference === "optional"}
                value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
            ) : null}
            <TextArea id="pay-note" label="Nota" optional={pick.note !== "required"} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
              hint={pick.to === "refunded" ? "Fecha, medio y referencia del reembolso." : undefined} />
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <div className="admin-actions">
              <button type="submit" className={`admin-btn ${pick.tone === "danger" ? "admin-btn-danger" : "admin-btn-solid"}`} disabled={busy} aria-busy={busy}>
                {busy ? "Guardando…" : "Confirmar"}
              </button>
              <button type="button" className="admin-btn admin-btn-quiet" onClick={() => setPick(null)}>Volver</button>
            </div>
          </form>
        )
      ) : null}

      {d.payments.length ? (
        <div className="admin-table-wrap mt-5">
          <table className="admin-table admin-table-cards">
            <thead>
              <tr><th scope="col">Intento</th><th scope="col">Estado</th><th scope="col">Referencia</th><th scope="col" className="num">Monto</th></tr>
            </thead>
            <tbody>
              {d.payments.map((p) => (
                <tr key={p.id}>
                  <td className="card-main">
                    {p.provider === "pixelpay" ? "PixelPay" : p.provider === "simulated" ? "Simulador" : "Manual"} #{p.attempt}
                    <span className="admin-sub">{fmtDateTime(p.createdAt)}</span>
                  </td>
                  <td>
                    <PaymentStatus value={p.status} />
                    {p.responseMessage ? <span className="admin-sub">{p.responseCode ? `${p.responseCode} · ` : ""}{p.responseMessage}</span> : null}
                  </td>
                  <td>
                    <span className="admin-mono">{p.reference ?? p.providerOrderRef ?? "—"}</span>
                    {p.providerPaymentId ? <span className="admin-sub admin-mono">{p.providerPaymentId}</span> : null}
                    {p.raw ? (
                      <details className="admin-details">
                        <summary>Respuesta de la pasarela</summary>
                        <pre>{JSON.stringify(p.raw, null, 2)}</pre>
                      </details>
                    ) : null}
                  </td>
                  <td className="num card-side">{money(p.amount, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}

function ReviewAlert({ d, setData }: { d: OrderDetail; setData: (d: OrderDetail) => void }) {
  const { can } = useAdmin();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const { run, busy, error, setError } = useAction(setData);
  return (
    <div className="admin-alert" role="note">
      <p><strong>Pedido en revisión.</strong> {d.order.review_reason ?? "Revisa los pagos antes de continuar."}</p>
      {can("admin") ? (
        open ? (
          <form className="mt-3 grid gap-3" onSubmit={async (e) => {
            e.preventDefault();
            if (!note.trim()) return setError("Explica cómo se resolvió.");
            if (await run("admin_resolve_review", { id: d.order.id, note: note.trim() }, "Revisión resuelta")) setOpen(false);
          }}>
            <TextArea id="review-note" label="Cómo se resolvió" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <div className="admin-actions">
              <button type="submit" className="admin-btn admin-btn-solid" disabled={busy}>Marcar como resuelto</button>
              <button type="button" className="admin-btn admin-btn-quiet" onClick={() => setOpen(false)}>Volver</button>
            </div>
          </form>
        ) : (
          <button type="button" className="admin-btn admin-btn-line mt-3" onClick={() => setOpen(true)}>Resolver revisión</button>
        )
      ) : null}
    </div>
  );
}

function NoteForm({ orderId, setData }: { orderId: string; setData: (d: OrderDetail) => void }) {
  const [note, setNote] = useState("");
  const { run, busy, error } = useAction(setData);
  return (
    <form className="grid gap-2" onSubmit={async (e) => {
      e.preventDefault();
      if (note.trim() && (await run("admin_add_note", { id: orderId, note: note.trim() }, "Nota guardada"))) setNote("");
    }}>
      <TextArea id="order-note" label="Nota interna" optional value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000}
        hint="Solo la ve el personal. Queda en el historial con tu nombre." />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div><button type="submit" className="admin-btn admin-btn-line" disabled={busy || !note.trim()}>Agregar nota</button></div>
    </form>
  );
}

function ShipmentPanel({ d, setData, carriers, trackingUrl }: { d: OrderDetail; setData: (d: OrderDetail) => void; carriers: Carrier[]; trackingUrl: string | null }) {
  const o = d.order;
  const s = d.shipment;
  const locked = o.status === "pending" || o.status === "cancelled";
  const [form, setForm] = useState(() => toForm(s));
  const { run, busy, error } = useAction(setData);
  const set = (k: keyof ReturnType<typeof toForm>) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Panel title="Envío">
      {s?.guide_number ? (
        <p className="mb-4 text-small">
          Guía <span className="admin-mono">{s.guide_number}</span>
          <span className="text-warm-gray"> · {s.print_count ? `impresa ${s.print_count}× (última ${fmtDateTime(s.last_printed_at)})` : "sin imprimir"}</span>
        </p>
      ) : null}
      {trackingUrl ? (
        <p className="mb-4"><a href={trackingUrl} target="_blank" rel="noopener" className="admin-btn admin-btn-quiet">Rastrear en {s?.carrier_name}</a></p>
      ) : null}
      {locked ? (
        <p className="text-small text-warm-gray">Confirma el pedido para registrar el envío y generar la guía.</p>
      ) : (
        <form className="admin-form" onSubmit={(e) => {
          e.preventDefault();
          run("admin_save_shipment", {
            order_id: o.id, carrier_id: form.carrier_id || null, tracking_number: form.tracking_number.trim() || null,
            packages: form.packages || "1", weight_kg: form.weight_kg, declared_value: form.declared_value,
            contents: form.contents.trim() || null, handling_notes: form.handling_notes.trim() || null,
          }, "Envío guardado");
        }}>
          <SelectField id="ship-carrier" label="Transportista" optional value={form.carrier_id} onChange={set("carrier_id")}>
            <option value="">Sin asignar</option>
            {carriers.filter((c) => c.is_active || c.id === form.carrier_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <TextField id="ship-tracking" label="Número de seguimiento" optional value={form.tracking_number} onChange={set("tracking_number")} maxLength={80}
            hint="El que entrega la transportista. El cliente lo ve en su pedido." />
          <div className="admin-grid-2">
            <TextField id="ship-packages" label="Paquetes" type="number" min={1} max={50} value={form.packages} onChange={set("packages")} />
            <TextField id="ship-weight" label="Peso (kg)" optional type="number" min={0} step="0.01" value={form.weight_kg} onChange={set("weight_kg")} />
          </div>
          <TextField id="ship-value" label="Valor declarado" optional type="number" min={0} step="0.01" value={form.declared_value} onChange={set("declared_value")}
            hint={<button type="button" className="underline" onClick={() => setForm((f) => ({ ...f, declared_value: String(o.subtotal) }))}>Usar el subtotal ({money(o.subtotal, o.currency)})</button>} />
          <TextArea id="ship-contents" label="Contenido" optional value={form.contents} onChange={set("contents")} maxLength={300} />
          <TextArea id="ship-handling" label="Indicaciones de manejo" optional value={form.handling_notes} onChange={set("handling_notes")} maxLength={300}
            placeholder="Frágil · Mantener en posición vertical" />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="admin-actions">
            <button type="submit" className="admin-btn admin-btn-solid" disabled={busy} aria-busy={busy}>{busy ? "Guardando…" : "Guardar envío"}</button>
            <Link href={`/admin/guias/?ids=${o.id}`} className="admin-btn admin-btn-line">Generar guía</Link>
          </div>
        </form>
      )}
    </Panel>
  );
}

function toForm(s: OrderDetail["shipment"]) {
  return {
    carrier_id: s?.carrier_id ?? "",
    tracking_number: s?.tracking_number ?? "",
    packages: String(s?.packages ?? 1),
    weight_kg: s?.weight_kg != null ? String(s.weight_kg) : "",
    declared_value: s?.declared_value != null ? String(s.declared_value) : "",
    contents: s?.contents ?? "",
    handling_notes: s?.handling_notes ?? "",
  };
}

export type { OrderDetail };
