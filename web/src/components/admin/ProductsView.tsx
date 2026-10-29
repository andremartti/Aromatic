"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { money } from "@/lib/shop/money";
import { ShopThumb } from "../shop/ShopThumb";
import { TextField } from "../shop/fields";
import { useAdmin } from "./AdminProvider";
import { Empty, ErrorNote, PageHead, Panel, Pill, SkeletonRows, errorMessage, useAdminData, useToast } from "./ui";

export interface AdminVariant {
  id: string;
  sku: string;
  presentation: string;
  price: number | null;
  stock: number | null;
  weight_kg: number | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}
export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  category: string;
  use_label: string | null;
  summary: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  variants: AdminVariant[];
  fragrance_ids: string[];
}
export interface Fragrance {
  id: string;
  name: string;
  sort_order: number;
}
export interface Catalog {
  products: AdminProduct[];
  fragrances: Fragrance[];
}

export function ProductsView() {
  const { me, can } = useAdmin();
  const cat = useAdminData<Catalog>("admin_list_products");
  const currency = me?.currency ?? "HNL";
  const data = cat.data;

  return (
    <>
      <PageHead title="Productos" meta={<span>Precios, presentaciones e inventario que usa la tienda.</span>}>
        {can("admin") ? <Link href="/admin/producto/?id=nuevo" className="admin-btn admin-btn-solid">Nuevo producto</Link> : null}
      </PageHead>
      {!can("admin") ? <p className="text-small text-warm-gray">Tu rol puede consultar el catálogo. Los cambios los hace un administrador.</p> : null}
      {cat.error ? <ErrorNote message={cat.error} onRetry={cat.reload} /> : null}
      {!data && cat.loading ? <SkeletonRows rows={6} /> : null}
      {data && !data.products.length ? (
        <Panel><Empty title="No hay productos">Crea el primero con “Nuevo producto”.</Empty></Panel>
      ) : null}
      {data?.products.map((p) => {
        const noPrice = p.variants.filter((v) => v.is_active && v.price === null).length;
        return (
          <Panel key={p.id} className="admin-panel-flush">
            <div className="admin-panel-head">
              <div className="admin-product-row">
                <ShopThumb slug={p.slug} name={p.name} imageUrl={p.image_url} sizes="64px" />
                <div className="min-w-0">
                  <h2 className="admin-panel-title">{p.name}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.8125rem] text-warm-gray">
                    {p.category} · {p.fragrance_ids.length} {p.fragrance_ids.length === 1 ? "aroma" : "aromas"}
                    {p.is_active ? <Pill tone="good">Visible</Pill> : <Pill tone="muted">Oculto</Pill>}
                    {noPrice ? <Pill tone="warn">{noPrice} sin precio</Pill> : null}
                  </p>
                </div>
              </div>
              <Link href={`/admin/producto/?id=${p.id}`} className="admin-btn admin-btn-line">{can("admin") ? "Editar" : "Ver"}</Link>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th scope="col">SKU</th><th scope="col">Presentación</th><th scope="col" className="num">Precio</th><th scope="col" className="num">Inventario</th><th scope="col">Venta en línea</th></tr>
                </thead>
                <tbody>
                  {p.variants.map((v) => (
                    <tr key={v.id}>
                      <td className="admin-mono">{v.sku}</td>
                      <td>{v.presentation}</td>
                      <td className="num">{v.price === null ? <span className="text-warm-gray">Sin precio</span> : money(v.price, currency)}</td>
                      <td className="num">{v.stock === null ? <span className="text-warm-gray">Sin control</span> : v.stock}</td>
                      <td>
                        {!v.is_active || !p.is_active ? <Pill tone="muted">Inactiva</Pill>
                          : v.price === null ? <Pill tone="warn">Falta el precio</Pill>
                          : v.stock === 0 ? <Pill tone="bad">Agotada</Pill>
                          : <Pill tone="good">Disponible</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}
      {data ? <Fragrances fragrances={data.fragrances} onSaved={cat.setData} canEdit={can("admin")} /> : null}
    </>
  );
}

function Fragrances({ fragrances, onSaved, canEdit }: { fragrances: Fragrance[]; onSaved: (c: Catalog) => void; canEdit: boolean }) {
  const { call } = useAdmin();
  const notify = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const slug = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  async function add(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Escribe el nombre del aroma.");
    setBusy(true);
    setError(null);
    try {
      onSaved(await call<Catalog>("admin_save_fragrance", { id: slug, name: name.trim(), sort_order: fragrances.length + 1 }));
      notify(`Aroma “${name.trim()}” agregado. Actívalo en cada producto que lo tenga.`);
      setName("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Aromas">
      <p className="text-small text-ink">{fragrances.map((f) => f.name).join(" · ") || "Sin aromas."}</p>
      {canEdit ? (
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={add}>
          <div className="w-full max-w-xs">
            <TextField id="new-fragrance" label="Nuevo aroma" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} error={error ?? undefined} />
          </div>
          <button type="submit" className="admin-btn admin-btn-line" disabled={busy}>Agregar aroma</button>
        </form>
      ) : null}
    </Panel>
  );
}
