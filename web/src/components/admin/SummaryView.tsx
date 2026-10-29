"use client";

import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/shop/money";
import { useAdmin } from "./AdminProvider";
import { RevenueChart, type RevenuePoint } from "./RevenueChart";
import { Empty, ErrorNote, PageHead, Panel, SkeletonRows, useAdminData } from "./ui";

interface Summary {
  currency: string;
  test: boolean;
  revenue: { total: number; today: number; week: number; month: number; paidOrders: number; averageTicket: number };
  counts: Record<"orders" | "pendingPayment" | "awaitingVerification" | "paid" | "toShip" | "shipped" | "delivered" | "cancelled" | "needsReview", number>;
  topProducts: { sku: string; name: string; presentation: string; units: number; revenue: number }[];
  daily: { date: string; revenue: number; orders: number }[];
  monthly: { month: string; revenue: number; orders: number }[];
}

const dayShort = new Intl.DateTimeFormat("es-HN", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("es-HN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("es-HN", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("es-HN", { month: "long", year: "numeric", timeZone: "UTC" });

export function SummaryView() {
  const { showTest } = useAdmin();
  const { data, error, loading, reload } = useAdminData<Summary>("admin_summary", { test: showTest });
  const [range, setRange] = useState<"daily" | "monthly">("daily");

  return (
    <>
      <PageHead title="Resumen" meta={<span>Solo pedidos pagados y vigentes · hora de Honduras</span>}>
        <Link href="/admin/pedidos/" className="admin-btn admin-btn-line">Ver pedidos</Link>
      </PageHead>
      {error ? <ErrorNote message={error} onRetry={reload} /> : null}
      {!data && loading ? <SkeletonRows rows={5} /> : null}
      {data ? <SummaryBody data={data} range={range} setRange={setRange} dim={loading} /> : null}
    </>
  );
}

function SummaryBody({ data, range, setRange, dim }: { data: Summary; range: "daily" | "monthly"; setRange: (r: "daily" | "monthly") => void; dim: boolean }) {
  const { revenue: r, counts: c, currency } = data;
  const points: RevenuePoint[] =
    range === "daily"
      ? data.daily.map((d) => ({ key: d.date, label: dayShort.format(new Date(d.date)), longLabel: dayLong.format(new Date(d.date)), revenue: Number(d.revenue), orders: d.orders }))
      : data.monthly.map((m) => ({ key: m.month, label: monthShort.format(new Date(`${m.month}-01`)), longLabel: monthLong.format(new Date(`${m.month}-01`)), revenue: Number(m.revenue), orders: m.orders }));
  const periodTotal = points.reduce((s, p) => s + p.revenue, 0);

  const queue = [
    { label: "Transferencias por verificar", n: c.awaitingVerification, href: "/admin/pedidos/?paymentStatus=awaiting_verification" },
    { label: "Pedidos en revisión", n: c.needsReview, href: "/admin/pedidos/?needsReview=1" },
    { label: "Por preparar y enviar", n: c.toShip, href: "/admin/envios/" },
    { label: "En camino", n: c.shipped, href: "/admin/envios/?tab=shipped" },
    { label: "Pendientes de pago o confirmación", n: c.pendingPayment, href: "/admin/pedidos/?status=pending" },
  ];

  return (
    <div className="admin-stack" style={{ opacity: dim ? 0.6 : 1, transition: "opacity 160ms ease" }}>
      <div className="admin-kpis">
        <div className="admin-kpi admin-kpi-main">
          <span className="admin-kpi-label">Ventas de este mes</span>
          <span className="admin-kpi-value">{money(r.month, currency)}</span>
          <span className="admin-kpi-note">{r.paidOrders} {r.paidOrders === 1 ? "pedido pagado" : "pedidos pagados"} en total · {money(r.total, currency)}</span>
        </div>
        <div className="admin-kpi">
          <span className="admin-kpi-label">Hoy</span>
          <span className="admin-kpi-value">{money(r.today, currency)}</span>
        </div>
        <div className="admin-kpi">
          <span className="admin-kpi-label">Esta semana</span>
          <span className="admin-kpi-value">{money(r.week, currency)}</span>
          <span className="admin-kpi-note">Desde el lunes</span>
        </div>
        <div className="admin-kpi">
          <span className="admin-kpi-label">Ticket promedio</span>
          <span className="admin-kpi-value">{money(r.averageTicket, currency)}</span>
        </div>
      </div>

      <div className="admin-cols">
        <div className="admin-stack">
          <Panel
            title={range === "daily" ? "Ingresos por día · últimos 30 días" : "Ingresos por mes · últimos 12 meses"}
            actions={
              <div className="admin-seg" role="group" aria-label="Periodo del gráfico">
                <button type="button" aria-pressed={range === "daily"} onClick={() => setRange("daily")}>30 días</button>
                <button type="button" aria-pressed={range === "monthly"} onClick={() => setRange("monthly")}>12 meses</button>
              </div>
            }
          >
            <p className="mb-3 text-small text-warm-gray">
              {money(periodTotal, currency)} en el periodo, por fecha de pago.
            </p>
            <RevenueChart
              data={points}
              currency={currency}
              title={range === "daily" ? "Ingresos por día, últimos 30 días" : "Ingresos por mes, últimos 12 meses"}
              description={`Total del periodo: ${money(periodTotal, currency)}.`}
            />
          </Panel>

          <Panel title="Productos más vendidos" className="admin-panel-flush">
            {data.topProducts.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th scope="col">Producto</th><th scope="col">SKU</th><th scope="col" className="num">Unidades</th><th scope="col" className="num">Ingresos</th></tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p) => (
                      <tr key={p.sku}>
                        <td>{p.name}<span className="admin-sub">{p.presentation}</span></td>
                        <td className="admin-mono">{p.sku}</td>
                        <td className="num">{p.units}</td>
                        <td className="num">{money(p.revenue, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Aún no hay ventas pagadas">Cuando entren los primeros pagos verás aquí qué presentaciones se venden más.</Empty>
            )}
          </Panel>
        </div>

        <div className="admin-stack">
          <Panel title="Por atender">
            <div className="admin-queue">
              {queue.map((q) => (
                <Link key={q.label} href={q.href} data-zero={q.n === 0 ? "" : undefined}>
                  <span>{q.label}</span>
                  <span className="admin-queue-count">{q.n}</span>
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Pedidos">
            <dl className="admin-dl admin-dl-2">
              <div><dt>Recibidos</dt><dd className="tabular">{c.orders}</dd></div>
              <div><dt>Pagados</dt><dd className="tabular">{c.paid}</dd></div>
              <div><dt>Entregados</dt><dd className="tabular">{c.delivered}</dd></div>
              <div><dt>Cancelados</dt><dd className="tabular">{c.cancelled}</dd></div>
            </dl>
            <p className="mt-4 text-[0.8125rem] text-warm-gray">
              Los ingresos excluyen pedidos cancelados, devueltos, sin pagar y de prueba.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
