"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { money } from "@/lib/shop/money";
import { CopyButton, ErrorNote, METHOD_SHORT, OrderStatus, PageHead, Panel, PaymentStatus, Pill, SkeletonRows, fmtDate, fmtDateTime, fmtPhone, useAdminData, waLink } from "./ui";

interface CustomerDetail {
  customer: { id: string; full_name: string; phone: string; email: string | null; created_at: string; last_order_at: string | null };
  addresses: { id: string; recipient_name: string; recipient_phone: string; alt_phone: string | null; department: string; city: string; neighborhood: string; address_line: string; reference: string | null; last_used_at: string }[] | null;
  orders: { id: string; orderNumber: string; createdAt: string; status: string; paymentStatus: string; paymentMethod: string; total: number; currency: string; isTest: boolean }[] | null;
  stats: { orders: number; totalSpent: number; lastOrderAt: string | null };
}

export function CustomerDetailView() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <Customer />
    </Suspense>
  );
}

function Customer() {
  const id = useSearchParams().get("id") ?? "";
  const valid = /^[0-9a-f-]{36}$/.test(id);
  const { data, error, reload } = useAdminData<CustomerDetail>(valid ? "admin_get_customer" : null, { id });
  if (!valid) return <ErrorNote message="Falta el cliente. Ábrelo desde el listado." />;
  if (error && !data) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <SkeletonRows rows={6} />;
  const c = data.customer;
  const currency = data.orders?.[0]?.currency ?? "HNL";

  return (
    <>
      <PageHead back={{ href: "/admin/clientes/", label: "Clientes" }} title={c.full_name} meta={<span>Cliente desde {fmtDate(c.created_at)}</span>}>
        <a href={waLink(c.phone)} target="_blank" rel="noopener" className="admin-btn admin-btn-line">WhatsApp</a>
        <a href={`tel:${c.phone}`} className="admin-btn admin-btn-line">Llamar</a>
      </PageHead>

      <div className="admin-cols">
        <div className="admin-stack">
          <Panel title="Pedidos" className="admin-panel-flush">
            <div className="admin-table-wrap">
              <table className="admin-table admin-table-cards">
                <thead>
                  <tr><th scope="col">Pedido</th><th scope="col">Pago</th><th scope="col">Estado</th><th scope="col" className="num">Total</th></tr>
                </thead>
                <tbody>
                  {(data.orders ?? []).map((o) => (
                    <tr key={o.id}>
                      <td className="card-main">
                        <Link href={`/admin/pedido/?id=${o.id}`} className="admin-row-link">{o.orderNumber}</Link>
                        {o.isTest ? <> <Pill tone="warn">Prueba</Pill></> : null}
                        <span className="admin-sub">{fmtDateTime(o.createdAt)}</span>
                      </td>
                      <td><PaymentStatus value={o.paymentStatus} /><span className="admin-sub">{METHOD_SHORT[o.paymentMethod]}</span></td>
                      <td><OrderStatus value={o.status} /></td>
                      <td className="num card-side">{money(o.total, o.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Direcciones usadas">
            <div className="grid gap-4">
              {(data.addresses ?? []).map((a) => {
                const text = [a.recipient_name, a.address_line, a.neighborhood, `${a.city}, ${a.department}`, a.reference ? `Ref.: ${a.reference}` : null, `Tel. ${fmtPhone(a.recipient_phone)}${a.alt_phone ? ` / ${fmtPhone(a.alt_phone)}` : ""}`].filter(Boolean).join("\n");
                return (
                  <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4 last:border-0 last:pb-0">
                    <p className="text-small whitespace-pre-line">{text}</p>
                    <CopyButton text={text} label="Copiar" done="Dirección copiada" />
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
        <Panel title="Ficha">
          <dl className="admin-dl">
            <div><dt>Teléfono</dt><dd className="tabular">{fmtPhone(c.phone)}</dd></div>
            <div><dt>Correo</dt><dd>{c.email ?? "—"}</dd></div>
            <div><dt>Pedidos (sin pruebas)</dt><dd className="tabular">{data.stats.orders}</dd></div>
            <div><dt>Total pagado</dt><dd className="tabular">{money(data.stats.totalSpent, currency)}</dd></div>
            <div><dt>Último pedido</dt><dd>{fmtDateTime(data.stats.lastOrderAt)}</dd></div>
          </dl>
        </Panel>
      </div>
    </>
  );
}
