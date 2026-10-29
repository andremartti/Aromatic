"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/config/shop";
import { SelectField, TextField } from "../shop/fields";
import { useAdmin } from "./AdminProvider";
import { BulkBar, OrdersTable, Pager, type OrderList } from "./OrdersTable";
import { Empty, ErrorNote, PageHead, Panel, SkeletonRows, downloadCsv, errorMessage, todayStamp, useAdminData, useToast } from "./ui";

const PAGE_SIZE = 50;
const NO_SELECTION = new Set<string>();
const KEYS = ["q", "status", "paymentStatus", "paymentMethod", "city", "dateFrom", "dateTo", "needsReview", "page"] as const;

export function OrdersView() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <Orders />
    </Suspense>
  );
}

function Orders() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { showTest, call } = useAdmin();
  const notify = useToast();
  const get = (k: (typeof KEYS)[number]) => params.get(k) ?? "";

  const filters = useMemo(() => {
    const f: Record<string, unknown> = { test: showTest };
    if (get("q")) f.q = get("q");
    if (get("status")) f.status = [get("status")];
    if (get("paymentStatus")) f.paymentStatus = [get("paymentStatus")];
    if (get("paymentMethod")) f.paymentMethod = [get("paymentMethod")];
    if (get("city")) f.city = get("city");
    if (get("dateFrom")) f.dateFrom = get("dateFrom");
    if (get("dateTo")) f.dateTo = get("dateTo");
    if (get("needsReview") === "1") f.needsReview = true;
    return f;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, showTest]);
  const page = Math.max(1, Number(get("page")) || 1);

  const list = useAdminData<OrderList>("admin_list_orders", { ...filters, page, pageSize: PAGE_SIZE });
  const settings = useAdminData<{ carriers: { id: string; name: string; is_active: boolean }[] }>("admin_get_settings");
  // La selección pertenece a un juego de filtros: al cambiarlos se vacía.
  const filterKey = JSON.stringify(filters);
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: filterKey, ids: new Set() });
  const selected = selection.key === filterKey ? selection.ids : NO_SELECTION;
  const setSelected = (ids: Set<string>) => setSelection({ key: filterKey, ids });
  const [q, setQ] = useState(get("q"));
  const [exporting, setExporting] = useState(false);

  function setParam(changes: Partial<Record<(typeof KEYS)[number], string>>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in changes)) next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Búsqueda con una pequeña pausa para no consultar en cada tecla.
  useEffect(() => {
    if (q === get("q")) return;
    const t = setTimeout(() => setParam({ q: q.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const anyFilter = KEYS.some((k) => k !== "page" && get(k));

  async function exportAll() {
    setExporting(true);
    try {
      const rows = await call<Record<string, unknown>[]>("admin_export_orders", filters);
      if (!rows.length) notify("No hay pedidos con esos filtros.", "bad");
      else downloadCsv(`pedidos${showTest ? "-prueba" : ""}-${todayStamp()}.csv`, rows);
    } catch (err) {
      notify(errorMessage(err), "bad");
    } finally {
      setExporting(false);
    }
  }

  const data = list.data;
  return (
    <>
      <PageHead title="Pedidos" meta={data ? <span className="tabular">{data.total} {data.total === 1 ? "pedido" : "pedidos"}{anyFilter ? " con estos filtros" : ""}</span> : null}>
        <button type="button" className="admin-btn admin-btn-line" onClick={exportAll} disabled={exporting || !data?.total} aria-busy={exporting}>
          {exporting ? "Exportando…" : "Exportar CSV"}
        </button>
      </PageHead>

      <div className="admin-filters" role="search">
        <div className="admin-filter-wide">
          <TextField id="f-q" label="Buscar" type="search" optional placeholder="Número, cliente, teléfono, ciudad o seguimiento" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <SelectField id="f-status" label="Estado" optional value={get("status")} onChange={(e) => setParam({ status: e.target.value })}>
          <option value="">Todos</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </SelectField>
        <SelectField id="f-pay" label="Pago" optional value={get("paymentStatus")} onChange={(e) => setParam({ paymentStatus: e.target.value })}>
          <option value="">Todos</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </SelectField>
        <SelectField id="f-method" label="Método" optional value={get("paymentMethod")} onChange={(e) => setParam({ paymentMethod: e.target.value })}>
          <option value="">Todos</option>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </SelectField>
        <SelectField id="f-city" label="Ciudad" optional value={get("city")} onChange={(e) => setParam({ city: e.target.value })}>
          <option value="">Todas</option>
          {(data?.cities ?? (get("city") ? [get("city")] : [])).map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectField>
        <TextField id="f-from" label="Desde" type="date" optional value={get("dateFrom")} onChange={(e) => setParam({ dateFrom: e.target.value })} />
        <TextField id="f-to" label="Hasta" type="date" optional value={get("dateTo")} onChange={(e) => setParam({ dateTo: e.target.value })} />
        <label className="form-check">
          <input type="checkbox" checked={get("needsReview") === "1"} onChange={(e) => setParam({ needsReview: e.target.checked ? "1" : "" })} />
          Solo en revisión
        </label>
        {anyFilter ? (
          <button type="button" className="admin-btn admin-btn-quiet justify-self-start" onClick={() => { setQ(""); router.replace(pathname, { scroll: false }); }}>
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {list.error ? <ErrorNote message={list.error} onRetry={list.reload} /> : null}

      <Panel className="admin-panel-flush">
        {!data && list.loading ? <SkeletonRows rows={8} /> : null}
        {data && data.rows.length === 0 ? (
          anyFilter ? (
            <Empty title="Ningún pedido coincide">Prueba con otro filtro o limpia la búsqueda.</Empty>
          ) : (
            <Empty title={showTest ? "No hay pedidos de prueba" : "Todavía no hay pedidos"}>
              Los pedidos de la tienda aparecerán aquí en cuanto un cliente termine el checkout, con su estado de pago y de envío.
            </Empty>
          )
        ) : null}
        {data && data.rows.length ? (
          <div style={{ opacity: list.loading ? 0.6 : 1, transition: "opacity 160ms ease" }}>
            <OrdersTable rows={data.rows} selected={selected} setSelected={setSelected} />
            <Pager total={data.total} page={data.page} pageSize={data.pageSize} onPage={(p) => setParam({ page: String(p) })} />
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
      />
    </>
  );
}
