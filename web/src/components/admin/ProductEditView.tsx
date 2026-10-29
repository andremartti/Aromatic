"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { PRODUCTS } from "@/products/products";
import { SelectField, TextArea, TextField } from "../shop/fields";
import { ShopThumb } from "../shop/ShopThumb";
import { useAdmin } from "./AdminProvider";
import type { AdminProduct, AdminVariant, Catalog } from "./ProductsView";
import { ErrorNote, PageHead, Panel, SkeletonRows, Switch, errorMessage, useAdminData, useToast } from "./ui";

type VariantForm = {
  key: string;
  id: string | null;
  sku: string;
  presentation: string;
  price: string;
  stock: number | null;
  newStock: string;
  weight_kg: string;
  image_url: string;
  is_active: boolean;
};
type ProductForm = {
  name: string; short_name: string; slug: string; category: string; use_label: string;
  summary: string; description: string; image_url: string; is_active: boolean; sort_order: string;
  fragrance_ids: string[]; variants: VariantForm[];
};

const toVariantForm = (v: AdminVariant): VariantForm => ({
  key: v.id, id: v.id, sku: v.sku, presentation: v.presentation, price: v.price === null ? "" : String(v.price),
  stock: v.stock, newStock: "", weight_kg: v.weight_kg === null ? "" : String(v.weight_kg), image_url: v.image_url ?? "", is_active: v.is_active,
});
const toForm = (p: AdminProduct | null): ProductForm => ({
  name: p?.name ?? "", short_name: p?.short_name ?? "", slug: p?.slug ?? "", category: p?.category ?? "", use_label: p?.use_label ?? "",
  summary: p?.summary ?? "", description: p?.description ?? "", image_url: p?.image_url ?? "", is_active: p?.is_active ?? true,
  sort_order: String(p?.sort_order ?? 0), fragrance_ids: p?.fragrance_ids ?? [], variants: (p?.variants ?? []).map(toVariantForm),
});
const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export function ProductEditView() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <ProductEdit />
    </Suspense>
  );
}

function ProductEdit() {
  const id = useSearchParams().get("id") ?? "nuevo";
  const cat = useAdminData<Catalog>("admin_list_products");
  if (cat.error && !cat.data) return <ErrorNote message={cat.error} onRetry={cat.reload} />;
  if (!cat.data) return <SkeletonRows rows={8} />;
  const product = id === "nuevo" ? null : cat.data.products.find((p) => p.id === id) ?? null;
  if (id !== "nuevo" && !product) return <ErrorNote message="No encontramos ese producto." />;
  return <Editor key={product?.id ?? "nuevo"} product={product} catalog={cat.data} setCatalog={cat.setData} />;
}

function Editor({ product, catalog, setCatalog }: { product: AdminProduct | null; catalog: Catalog; setCatalog: (c: Catalog) => void }) {
  const { call, can, me } = useAdmin();
  const notify = useToast();
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>(() => toForm(product));
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const editable = can("admin");
  const official = PRODUCTS.some((p) => p.slug === form.slug);
  const currency = me?.currency ?? "HNL";

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setVariant = (key: string, patch: Partial<VariantForm>) =>
    setForm((f) => ({ ...f, variants: f.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.variants.length) return setError("Agrega al menos una presentación.");
    for (const v of form.variants) {
      if (v.price !== "" && !(Number(v.price) >= 0)) return setError(`Precio inválido en ${v.sku || "una presentación"}.`);
    }
    setBusy(true);
    try {
      const payload = {
        id: product?.id ?? null,
        slug: form.slug, name: form.name, short_name: form.short_name || form.name.replace(/^AROMATIC\s+/i, ""), category: form.category,
        use_label: form.use_label || null, summary: form.summary || null, description: form.description || null,
        image_url: form.image_url || null, is_active: form.is_active, sort_order: Number(form.sort_order) || 0,
        fragrance_ids: form.fragrance_ids,
        variants: form.variants.map((v) => ({
          id: v.id, sku: v.sku, presentation: v.presentation, price: v.price, weight_kg: v.weight_kg,
          image_url: v.image_url || null, is_active: v.is_active,
          // El inventario de presentaciones existentes solo cambia con "Ajustar" (queda el motivo).
          ...(v.id ? {} : { stock: v.newStock }),
        })),
      };
      const next = await call<Catalog>("admin_save_product", payload);
      setCatalog(next);
      notify("Producto guardado");
      const saved = product && next.products.find((p) => p.id === product.id);
      if (saved) setForm(toForm(saved));
      if (!product) {
        const created = next.products.find((p) => p.slug === form.slug);
        if (created) router.replace(`/admin/producto/?id=${created.id}`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="admin-stack">
      <PageHead back={{ href: "/admin/productos/", label: "Productos" }} title={product ? product.name : "Nuevo producto"}>
        {editable ? (
          <button type="submit" className="admin-btn admin-btn-solid" disabled={busy} aria-busy={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button>
        ) : null}
      </PageHead>
      {error ? <ErrorNote message={error} /> : null}

      <fieldset disabled={!editable} className="admin-cols min-w-0">
        <div className="admin-stack">
          <Panel title="Presentaciones y precios">
            <p className="mb-4 text-[0.8125rem] text-warm-gray">
              Los precios los define el negocio. Una presentación sin precio se muestra en el sitio pero no se puede comprar en línea.
            </p>
            {form.variants.map((v, i) => (
              <VariantRow key={v.key} v={v} index={i} currency={currency} setVariant={setVariant} editable={editable}
                onRemove={() => set("variants", form.variants.filter((x) => x.key !== v.key))} onCatalog={(c) => {
                  setCatalog(c);
                  const fresh = c.products.flatMap((p) => p.variants).find((x) => x.id === v.id);
                  if (fresh) setVariant(v.key, { stock: fresh.stock });
                }} call={call} />
            ))}
            {editable ? (
              <button type="button" className="admin-btn admin-btn-line mt-4" onClick={() => set("variants", [...form.variants, {
                key: `new-${Date.now()}`, id: null, sku: "", presentation: "", price: "", stock: null, newStock: "", weight_kg: "", image_url: "", is_active: true,
              }])}>
                Agregar presentación
              </button>
            ) : null}
          </Panel>

          <Panel title="Aromas">
            {catalog.fragrances.length ? (
              <div className="admin-chips" role="group" aria-label="Aromas disponibles para este producto">
                {catalog.fragrances.map((f) => (
                  <label key={f.id} className="admin-chip">
                    <input type="checkbox" checked={form.fragrance_ids.includes(f.id)} onChange={(e) =>
                      set("fragrance_ids", e.target.checked ? [...form.fragrance_ids, f.id] : form.fragrance_ids.filter((x) => x !== f.id))} />
                    {f.name}
                  </label>
                ))}
              </div>
            ) : <p className="text-small text-warm-gray">Crea aromas desde la lista de productos.</p>}
            <p className="mt-3 text-[0.8125rem] text-warm-gray">Sin aromas marcados, el cliente no elige aroma al comprar.</p>
          </Panel>
        </div>

        <div className="admin-stack">
          <Panel title="Ficha">
            <div className="admin-form">
              <TextField id="p-name" label="Nombre" value={form.name} maxLength={120} onChange={(e) => {
                set("name", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value.replace(/^AROMATIC\s+/i, "")));
              }} />
              <TextField id="p-short" label="Nombre corto" optional value={form.short_name} maxLength={80} onChange={(e) => set("short_name", e.target.value)} />
              {product ? (
                <p className="text-small"><span className="text-warm-gray">Identificador (slug): </span><span className="admin-mono">{form.slug}</span></p>
              ) : (
                <TextField id="p-slug" label="Identificador (slug)" value={form.slug} maxLength={80} hint="Minúsculas y guiones. No se puede cambiar después."
                  onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
              )}
              <TextField id="p-cat" label="Categoría" value={form.category} maxLength={80} onChange={(e) => set("category", e.target.value)} />
              <TextField id="p-use" label="Uso" optional value={form.use_label} maxLength={80} onChange={(e) => set("use_label", e.target.value)} placeholder="Para la ropa" />
              <TextArea id="p-summary" label="Resumen" optional value={form.summary} maxLength={400} onChange={(e) => set("summary", e.target.value)} />
              <TextArea id="p-desc" label="Descripción" optional value={form.description} maxLength={4000} rows={4} onChange={(e) => set("description", e.target.value)} />
              <TextField id="p-order" label="Orden en la tienda" type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
              <Switch checked={form.is_active} onChange={(v) => set("is_active", v)} label="Visible en la tienda" disabled={!editable} />
            </div>
          </Panel>
          <Panel title="Imagen">
            {official ? (
              <p className="text-small text-ink">Este producto usa sus fotografías y etiquetas oficiales en el sitio; no se reemplazan desde aquí.</p>
            ) : (
              <ImageField slug={form.slug} value={form.image_url} onChange={(url) => set("image_url", url)} editable={editable} name={form.name} />
            )}
          </Panel>
        </div>
      </fieldset>
    </form>
  );
}

function VariantRow({ v, index, currency, setVariant, onRemove, onCatalog, editable, call }: {
  v: VariantForm; index: number; currency: string; editable: boolean;
  setVariant: (key: string, patch: Partial<VariantForm>) => void;
  onRemove: () => void; onCatalog: (c: Catalog) => void;
  call: <T>(fn: string, args?: Record<string, unknown>) => Promise<T>;
}) {
  const notify = useToast();
  const [adjust, setAdjust] = useState(false);
  const [mode, setMode] = useState<"add" | "set" | "untrack">("add");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const p = `v${index}`;

  async function applyStock() {
    setErr(null);
    if (mode !== "untrack" && !/^-?\d+$/.test(value.trim())) return setErr("Escribe un número entero.");
    if (!reason.trim()) return setErr("Escribe el motivo (compra, conteo, merma…).");
    setBusy(true);
    try {
      onCatalog(await call<Catalog>("admin_adjust_stock", { variant_id: v.id, mode, value: mode === "untrack" ? null : Number(value), reason: reason.trim() }));
      notify(`Inventario de ${v.sku} actualizado`);
      setAdjust(false);
      setValue("");
      setReason("");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-variant">
      <TextField id={`${p}-sku`} label="SKU" value={v.sku} maxLength={24} onChange={(e) => setVariant(v.key, { sku: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} />
      <TextField id={`${p}-pres`} label="Presentación" value={v.presentation} maxLength={60} onChange={(e) => setVariant(v.key, { presentation: e.target.value })} placeholder="Galón" />
      <TextField id={`${p}-price`} label={currency === "HNL" ? "Precio (L)" : `Precio (${currency})`} optional type="number" min={0} step="0.01" inputMode="decimal" value={v.price}
        onChange={(e) => setVariant(v.key, { price: e.target.value })} placeholder="Sin precio" />
      {v.id ? (
        <div className="form-field">
          <span className="text-[0.8125rem] font-medium text-charcoal">Inventario</span>
          <p className="admin-variant-stock flex min-h-10 items-center gap-2 text-small tabular">
            {v.stock === null ? "Sin control" : `${v.stock} u.`}
            {editable ? <button type="button" className="admin-btn admin-btn-quiet" onClick={() => setAdjust((a) => !a)} aria-expanded={adjust}>Ajustar</button> : null}
          </p>
        </div>
      ) : (
        <TextField id={`${p}-stock`} label="Inventario" optional type="number" min={0} step="1" value={v.newStock}
          onChange={(e) => setVariant(v.key, { newStock: e.target.value })} placeholder="Sin control" />
      )}
      <TextField id={`${p}-weight`} label="Peso (kg)" optional type="number" min={0} step="0.001" value={v.weight_kg} onChange={(e) => setVariant(v.key, { weight_kg: e.target.value })} />
      <div className="flex items-center gap-2 pb-0.5">
        {v.id ? (
          <Switch checked={v.is_active} onChange={(on) => setVariant(v.key, { is_active: on })} label="Activa" disabled={!editable} />
        ) : editable ? (
          <button type="button" className="admin-btn admin-btn-quiet" onClick={onRemove}>Quitar</button>
        ) : null}
      </div>
      {adjust && v.id ? (
        <div className="admin-choice lg:col-span-6">
          <div className="admin-grid-3">
            <SelectField id={`${p}-mode`} label="Tipo de ajuste" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="add">Sumar o restar unidades</option>
              <option value="set">Fijar el total (conteo)</option>
              <option value="untrack">No controlar inventario</option>
            </SelectField>
            {mode !== "untrack" ? (
              <TextField id={`${p}-val`} label={mode === "add" ? "Unidades (+/−)" : "Total contado"} type="number" step="1" value={value} onChange={(e) => setValue(e.target.value)} />
            ) : <span />}
            <TextField id={`${p}-reason`} label="Motivo" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Producción del día" />
          </div>
          {err ? <p className="form-error" role="alert">{err}</p> : null}
          <div className="admin-actions">
            <button type="button" className="admin-btn admin-btn-solid" onClick={applyStock} disabled={busy} aria-busy={busy}>Aplicar ajuste</button>
            <button type="button" className="admin-btn admin-btn-quiet" onClick={() => setAdjust(false)}>Cancelar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function ImageField({ slug, value, onChange, editable, name }: { slug: string; value: string; onChange: (url: string) => void; editable: boolean; name: string }) {
  const { supabase } = useAdmin();
  const notify = useToast();
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!IMAGE_TYPES.includes(file.type)) return notify("Usa una imagen JPG, PNG, WebP o AVIF.", "bad");
    if (file.size > 5 * 1024 * 1024) return notify("La imagen pesa más de 5 MB.", "bad");
    if (!slug) return notify("Escribe primero el nombre del producto.", "bad");
    setBusy(true);
    try {
      const sb = await supabase();
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${slug}/${Date.now()}.${ext}`;
      const { error } = await sb.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
      if (error) throw error;
      onChange(sb.storage.from("product-images").getPublicUrl(path).data.publicUrl);
      notify("Imagen subida. Guarda el producto para publicarla.");
    } catch {
      notify("No se pudo subir la imagen. Verifica que tu rol sea administrador y que el almacenamiento esté configurado.", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-form">
      <div className="w-28"><ShopThumb slug={undefined} name={name || "?"} imageUrl={value || null} sizes="112px" /></div>
      {editable ? (
        <label className="admin-btn admin-btn-line w-fit cursor-pointer">
          {busy ? "Subiendo…" : "Subir imagen"}
          <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
      ) : null}
      <TextField id="p-image" label="O pega el enlace (https)" optional type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://" />
    </div>
  );
}
