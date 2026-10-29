"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ORDER_STATUS_LABELS } from "@/config/shop";
import { useAdmin } from "./AdminProvider";
import { BulkBar, OrdersTable, Pager, type OrderList, type OrderRow } from "./OrdersTable";
import { Empty, ErrorNote, PageHead, Panel, SkeletonRows, errorMessage, useAdminData, useToast } from "./ui";

const TABS = [
  { id: "prepare", label: "Por preparar", status: ["confirmed", "preparing"], next: ["preparing", "ready_to_ship", "shipped"] },
  { id: "ready", label: "Listos para enviar", status: ["ready_to_ship"], next: ["shipped"] },
  { id: "shipped", label: "En camino", status: ["shipped"], next: ["delivered"] },
  { id: "delivered", label: "Entregados", status: ["delivered"], next: [] },
] as const;

export function ShipmentsView() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <Shipments />
    </Suspense>
  );
}

function Shipments() {
  const params = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get("tab")) ?? TABS[0];
  const { showTest } = useAdmin();
  // Cada pestaña empieza con su propia página y selección.
  return <ShipmentsTab key={`${tab.id}|${showTest}`} tab={tab} showTest={showTest} />;
}

function ShipmentsTab({ tab, showTest }: { tab: (typeof TABS)[number]; showTest: boolean }) {
  const [page, setPage] = useState(1);
  const filters = { test: showTest, status: [...tab.status] };
  const list = useAdminData<OrderList>("admin_list_orders", { ...filters, page, pageSize: 100 });
  const settings = useAdminData<{ carriers: { id: string; name: string; is_active: boolean }[] }>("admin_get_settings");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const data = list.data;
  return (
    <>
      <PageHead title="Envíos" meta={<span>Prepara, imprime guías por lote y registra el seguimiento.</span>} />

      <nav className="admin-tabs" aria-label="Etapas de envío">
        {TABS.map((t) => (
          <Link key={t.id} href={t.id === "prepare" ? "/admin/envios/" : `/admin/envios/?tab=${t.id}`} className="admin-tab"
            aria-current={t.id === tab.id ? "page" : undefined}>
            {t.label}
            {t.id === tab.id && data ? <span className="admin-tab-count tabular">{data.total}</span> : null}
          </Link>
        ))}
      </nav>

      {list.error ? <ErrorNote message={list.error} onRetry={list.reload} /> : null}

      <Panel className="admin-panel-flush">
        {!data && list.loading ? <SkeletonRows rows={6} /> : null}
        {data && !data.rows.length ? (
          <Empty title={tab.id === "prepare" ? "Nada por preparar" : "No hay pedidos en esta etapa"}>
            {tab.id === "prepare"
              ? "Los pedidos aparecen aquí cuando el pago está confirmado (o son contra entrega). Desde aquí generas las guías por lote."
              : "Cambia de pestaña para ver otras etapas."}
          </Empty>
        ) : null}
        {data && data.rows.length ? (
          <div style={{ opacity: list.loading ? 0.6 : 1, transition: "opacity 160ms ease" }}>
            <OrdersTable rows={data.rows} selected={selected} setSelected={setSelected} variant="shipments" />
            {data.total > data.pageSize ? <Pager total={data.total} page={data.page} pageSize={data.pageSize} onPage={setPage} /> : null}
          </div>
        ) : null}
      </Panel>

      <BulkBar
        rows={data?.rows ?? []}
        selected={selected}
        setSelected={setSelected}
        carriers={settings.data?.carriers ?? []}
        onChanged={list.reload}
        filters={filters}
        extra={tab.next.length ? <BulkStatus rows={data?.rows ?? []} selected={selected} next={[...tab.next]} onDone={() => { setSelected(new Set()); list.reload(); }} /> : null}
      />
    </>
  );
}

/** Cambia el estado de varios pedidos (uno por uno, con el mismo control que el detalle). */
function BulkStatus({ rows, selected, next, onDone }: { rows: OrderRow[]; selected: Set<string>; next: string[]; onDone: () => void }) {
  const { call } = useAdmin();
  const notify = useToast();
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply() {
    if (!to) return;
    setBusy(true);
    const chosen = rows.filter((r) => selected.has(r.id));
    const failed: string[] = [];
    for (const r of chosen) {
      try {
        await call("admin_update_order_status", { id: r.id, status: to, note: "Cambio por lote" });
      } catch (err) {
        failed.push(`${r.order_number} (${errorMessage(err)})`);
      }
    }
    setBusy(false);
    const ok = chosen.length - failed.length;
    if (ok) notify(`${ok} ${ok === 1 ? "pedido" : "pedidos"}: ${ORDER_STATUS_LABELS[to]}.`);
    if (failed.length) notify(`Sin cambiar: ${failed.join("; ")}`, "bad");
    onDone();
  }

  return (
    <span className="flex items-center gap-2">
      <label htmlFor="bulk-status" className="sr-only">Cambiar estado</label>
      <select id="bulk-status" value={to} onChange={(e) => setTo(e.target.value)}>
        <option value="">Cambiar estado…</option>
        {next.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
      </select>
      <button type="button" className="admin-btn admin-btn-line" disabled={busy || !to} onClick={apply} aria-busy={busy}>
        {busy ? "Aplicando…" : "Aplicar"}
      </button>
    </span>
  );
}
