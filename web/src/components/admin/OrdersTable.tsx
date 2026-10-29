"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/shop/money";
import { useAdmin } from "./AdminProvider";
import { METHOD_SHORT, OrderStatus, PaymentStatus, Pill, downloadCsv, errorMessage, fmtDateTime, fmtPhone, todayStamp, useToast } from "./ui";

export interface OrderRow {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  ship_city: string;
  ship_department: string;
  total: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  status: string;
  is_test: boolean;
  needs_review: boolean;
  item_count: number;
  carrier_name: string | null;
  tracking_number: string | null;
  guide_number: string | null;
  print_count: number;
}

export interface OrderList {
  total: number;
  page: number;
  pageSize: number;
  rows: OrderRow[];
  cities: string[];
}

/** Tabla de pedidos con selección para acciones por lote (guías, transportista, CSV). */
export function OrdersTable({ rows, selected, setSelected, variant = "orders" }: {
  rows: OrderRow[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  variant?: "orders" | "shipments";
}) {
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    for (const r of rows) {
      if (allOn) next.delete(r.id);
      else next.add(r.id);
    }
    setSelected(next);
  };

  return (
    <div className="admin-table-wrap">
      <table className="admin-table admin-table-cards">
        <thead>
          <tr>
            <th scope="col" className="check">
              <input type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Seleccionar todos los pedidos de esta página" />
            </th>
            <th scope="col">Pedido</th>
            <th scope="col">{variant === "orders" ? "Cliente" : "Recibe"}</th>
            <th scope="col">Destino</th>
            {variant === "orders" ? <th scope="col" className="num">Total</th> : null}
            <th scope="col">Pago</th>
            <th scope="col">Estado</th>
            <th scope="col">Envío</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-selected={selected.has(r.id) ? "" : undefined}>
              <td className="check">
                <label className="admin-check">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Seleccionar ${r.order_number}`} />
                </label>
              </td>
              <td className="card-main">
                <Link href={`/admin/pedido/?id=${r.id}`} className="admin-row-link">{r.order_number}</Link>
                {r.needs_review ? <> <Pill tone="bad">Revisar</Pill></> : null}
                <span className="admin-sub">{fmtDateTime(r.created_at)} · {r.item_count} {r.item_count === 1 ? "unidad" : "unidades"}</span>
              </td>
              <td>
                {r.customer_name}
                <span className="admin-sub tabular">{fmtPhone(r.customer_phone)}</span>
              </td>
              <td>
                {r.ship_city}
                <span className="admin-sub">{r.ship_department}</span>
              </td>
              {variant === "orders" ? <td className="num card-side tabular">{money(r.total, r.currency)}</td> : null}
              <td>
                <PaymentStatus value={r.payment_status} />
                <span className="admin-sub">{METHOD_SHORT[r.payment_method] ?? r.payment_method}</span>
              </td>
              <td><OrderStatus value={r.status} /></td>
              <td className={r.carrier_name || r.guide_number ? "" : "card-hide"}>
                {r.carrier_name ?? <span className="text-warm-gray">Sin transportista</span>}
                <span className="admin-sub">
                  {r.tracking_number ? `Seg. ${r.tracking_number}` : r.guide_number ? r.guide_number : "Sin guía"}
                  {r.print_count ? ` · impresa ${r.print_count}×` : ""}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ total, page, pageSize, onPage }: { total: number; page: number; pageSize: number; onPage: (p: number) => void }) {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="admin-pager">
      <span className="tabular">{from}–{to} de {total}</span>
      <div className="admin-actions">
        <button type="button" className="admin-btn admin-btn-line" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
        <span className="tabular">Página {page} de {pages}</span>
        <button type="button" className="admin-btn admin-btn-line" disabled={page >= pages} onClick={() => onPage(page + 1)}>Siguiente</button>
      </div>
    </div>
  );
}

type Carrier = { id: string; name: string; is_active: boolean };
const NO_GUIDE = new Set(["pending", "cancelled"]);

/**
 * Barra de acciones para la selección. Las guías se generan solo de pedidos
 * confirmados (el servidor también lo valida).
 */
export function BulkBar({ rows, selected, setSelected, carriers, onChanged, filters, extra }: {
  rows: OrderRow[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  carriers: Carrier[];
  onChanged: () => void;
  filters: Record<string, unknown>;
  extra?: React.ReactNode;
}) {
  const { call } = useAdmin();
  const notify = useToast();
  const router = useRouter();
  const [carrier, setCarrier] = useState("");
  const [busy, setBusy] = useState(false);
  if (!selected.size) return null;
  const ids = [...selected];
  const chosen = rows.filter((r) => selected.has(r.id));
  const blocked = chosen.filter((r) => NO_GUIDE.has(r.status));

  async function assign() {
    if (!carrier) return notify("Elige una transportista.", "bad");
    setBusy(true);
    try {
      const res = await call<{ updated: number; skipped: number }>("admin_bulk_assign_carrier", { order_ids: ids, carrier_id: carrier });
      notify(`Transportista asignada a ${res.updated} ${res.updated === 1 ? "pedido" : "pedidos"}${res.skipped ? ` · ${res.skipped} omitidos (sin confirmar o entregados)` : ""}.`);
      onChanged();
    } catch (err) {
      notify(errorMessage(err), "bad");
    } finally {
      setBusy(false);
    }
  }

  async function exportSelected() {
    setBusy(true);
    try {
      const numbers = new Set(chosen.map((r) => r.order_number));
      const all = await call<Record<string, unknown>[]>("admin_export_orders", filters);
      downloadCsv(`pedidos-seleccion-${todayStamp()}.csv`, all.filter((r) => numbers.has(String(r.pedido))));
    } catch (err) {
      notify(errorMessage(err), "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-bulk no-print" role="region" aria-label="Acciones para la selección">
      <strong className="tabular">{selected.size} {selected.size === 1 ? "seleccionado" : "seleccionados"}</strong>
      <button
        type="button"
        className="admin-btn admin-btn-solid"
        disabled={busy || selected.size > 100}
        title={blocked.length ? `Sin confirmar: ${blocked.map((b) => b.order_number).join(", ")}` : undefined}
        onClick={() => {
          if (blocked.length) return notify(`Confirma primero: ${blocked.map((b) => b.order_number).join(", ")}.`, "bad");
          router.push(`/admin/guias/?ids=${ids.join(",")}`);
        }}
      >
        Generar guías
      </button>
      <span className="flex items-center gap-2">
        <label htmlFor="bulk-carrier" className="sr-only">Transportista</label>
        <select id="bulk-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
          <option value="">Transportista…</option>
          {carriers.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" className="admin-btn admin-btn-line" disabled={busy || !carrier} onClick={assign}>Asignar</button>
      </span>
      {extra}
      <button type="button" className="admin-btn admin-btn-line" disabled={busy} onClick={exportSelected}>Exportar CSV</button>
      <button type="button" className="admin-btn admin-btn-quiet ml-auto" onClick={() => setSelected(new Set())}>Quitar selección</button>
    </div>
  );
}
