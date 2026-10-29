"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { money } from "@/lib/shop/money";
import { TextField } from "../shop/fields";
import { useAdmin } from "./AdminProvider";
import { Pager } from "./OrdersTable";
import { Empty, ErrorNote, PageHead, Panel, SkeletonRows, fmtDate, fmtPhone, useAdminData } from "./ui";

interface CustomerRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  location: string | null;
  orders: number;
  total_spent: number;
  created_at: string;
  last_order_at: string | null;
}

/** Clientes: uno por teléfono (el servidor los unifica al comprar). */
export function CustomersView() {
  const { me } = useAdmin();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const list = useAdminData<{ total: number; page: number; pageSize: number; rows: CustomerRow[] }>("admin_list_customers", { q: query || undefined, page, pageSize: 50 });

  useEffect(() => {
    const t = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const data = list.data;
  const currency = me?.currency ?? "HNL";
  return (
    <>
      <PageHead title="Clientes" meta={data ? <span className="tabular">{data.total} {data.total === 1 ? "cliente" : "clientes"}</span> : null} />
      <div className="max-w-xl" role="search">
        <TextField id="c-q" label="Buscar" type="search" optional placeholder="Nombre, correo o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.error ? <ErrorNote message={list.error} onRetry={list.reload} /> : null}
      <Panel className="admin-panel-flush">
        {!data && list.loading ? <SkeletonRows rows={6} /> : null}
        {data && !data.rows.length ? (
          <Empty title={query ? "Ningún cliente coincide" : "Todavía no hay clientes"}>
            {query ? "Prueba con otra parte del nombre o los últimos 4 dígitos del teléfono." : "Cada compra crea o actualiza la ficha del cliente con su teléfono como identificador."}
          </Empty>
        ) : null}
        {data && data.rows.length ? (
          <div style={{ opacity: list.loading ? 0.6 : 1 }}>
            <div className="admin-table-wrap">
              <table className="admin-table admin-table-cards">
                <thead>
                  <tr>
                    <th scope="col">Cliente</th><th scope="col">Contacto</th><th scope="col">Ubicación</th>
                    <th scope="col" className="num">Pedidos</th><th scope="col" className="num">Total pagado</th><th scope="col">Último pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((c) => (
                    <tr key={c.id}>
                      <td className="card-main"><Link href={`/admin/cliente/?id=${c.id}`} className="admin-row-link">{c.full_name}</Link></td>
                      <td>{fmtPhone(c.phone)}<span className="admin-sub">{c.email ?? "Sin correo"}</span></td>
                      <td>{c.location ?? "—"}</td>
                      <td className="num" data-label="Pedidos">{c.orders}</td>
                      <td className="num card-side">{money(c.total_spent, currency)}</td>
                      <td data-label="Último">{fmtDate(c.last_order_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager total={data.total} page={data.page} pageSize={data.pageSize} onPage={setPage} />
          </div>
        ) : null}
      </Panel>
      <p className="text-[0.8125rem] text-warm-gray">Pedidos y total pagado no incluyen pedidos de prueba ni cancelados.</p>
    </>
  );
}
