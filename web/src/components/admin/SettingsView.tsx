"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { shopApi, type StoreData } from "@/lib/shop/api";
import { money } from "@/lib/shop/money";
import { SelectField, TextArea, TextField } from "../shop/fields";
import { useAdmin, type StaffRole } from "./AdminProvider";
import { ROLE_LABELS } from "./AdminShell";
import { Empty, ErrorNote, PageHead, Panel, Pill, SkeletonRows, Switch, errorMessage, fmtDateTime, useAdminData, useToast } from "./ui";

interface Settings {
  store_enabled: boolean; prices_include_tax: boolean; currency: string;
  card_enabled: boolean; transfer_enabled: boolean; cod_enabled: boolean;
  transfer_instructions: string | null; cod_instructions: string | null;
  max_units_per_order: number; card_payment_ttl_minutes: number; order_prefix: string;
  sender_name: string; sender_phone: string | null; sender_address: string | null; sender_city: string | null;
  sender_department: string | null; sender_country: string;
}
interface Zone { id: string; name: string; country: string; departments: string[]; price: number; free_over: number | null; estimated_days: string | null; is_active: boolean; sort_order: number }
interface Carrier { id: string; name: string; phone: string | null; tracking_url: string | null; is_active: boolean }
interface SettingsData { settings: Settings; zones: Zone[]; carriers: Carrier[]; departments: string[]; role: StaffRole }

const TABS = [
  { id: "tienda", label: "Tienda y pagos" },
  { id: "envios", label: "Envíos" },
  { id: "personal", label: "Personal", role: "owner" as StaffRole },
  { id: "bitacora", label: "Bitácora", role: "admin" as StaffRole },
];

export function SettingsView() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <SettingsPage />
    </Suspense>
  );
}

function SettingsPage() {
  const { can } = useAdmin();
  const tabId = useSearchParams().get("s") ?? "tienda";
  const tabs = TABS.filter((t) => !t.role || can(t.role));
  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0];
  const data = useAdminData<SettingsData>(tab.id === "tienda" || tab.id === "envios" ? "admin_get_settings" : null);

  return (
    <>
      <PageHead title="Ajustes" />
      <nav className="admin-tabs" aria-label="Secciones de ajustes">
        {tabs.map((t) => (
          <Link key={t.id} href={t.id === "tienda" ? "/admin/ajustes/" : `/admin/ajustes/?s=${t.id}`} className="admin-tab" aria-current={t.id === tab.id ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      {!can("admin") && (tab.id === "tienda" || tab.id === "envios") ? (
        <p className="text-small text-warm-gray">Puedes consultar los ajustes. Para cambiarlos se necesita el rol de administrador.</p>
      ) : null}
      {data.error ? <ErrorNote message={data.error} onRetry={data.reload} /> : null}
      {tab.id === "tienda" ? (data.data ? <StoreTab key={JSON.stringify(data.data.settings)} data={data.data} setData={data.setData} /> : <SkeletonRows />) : null}
      {tab.id === "envios" ? (data.data ? <ShippingTab data={data.data} setData={data.setData} /> : <SkeletonRows />) : null}
      {tab.id === "personal" ? <StaffTab /> : null}
      {tab.id === "bitacora" ? <AuditTab /> : null}
    </>
  );
}

function useSave(setData: (d: SettingsData) => void) {
  const { call } = useAdmin();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(fn: string, args: Record<string, unknown>, ok: string) {
    setBusy(true);
    setError(null);
    try {
      setData(await call<SettingsData>(fn, args));
      notify(ok);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { save, busy, error };
}

/* ---------------------------------------------------------------------------
 *  Tienda y pagos
 * ------------------------------------------------------------------------- */
function StoreTab({ data, setData }: { data: SettingsData; setData: (d: SettingsData) => void }) {
  const { can } = useAdmin();
  const editable = can("admin");
  const s = data.settings;
  const [f, setF] = useState(s);
  const [gateway, setGateway] = useState<StoreData["payments"] | null>(null);
  const { save, busy, error } = useSave(setData);
  useEffect(() => {
    shopApi.store().then((d) => setGateway(d.payments)).catch(() => setGateway(null));
  }, []);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    await save("admin_save_settings", {
      store_enabled: f.store_enabled, prices_include_tax: f.prices_include_tax,
      card_enabled: f.card_enabled, transfer_enabled: f.transfer_enabled, cod_enabled: f.cod_enabled,
      transfer_instructions: f.transfer_instructions ?? "", cod_instructions: f.cod_instructions ?? "",
      max_units_per_order: Number(f.max_units_per_order), card_payment_ttl_minutes: Number(f.card_payment_ttl_minutes),
    }, "Ajustes guardados");
  }

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={!editable} className="admin-cols min-w-0">
        <div className="admin-stack">
          <Panel title="Tienda">
            <div className="admin-form">
              <Switch checked={f.store_enabled} onChange={(v) => set("store_enabled", v)} disabled={!editable} label="Tienda abierta"
                hint="Cerrada, el catálogo se ve pero no se puede comprar." />
              <Switch checked={f.prices_include_tax} onChange={(v) => set("prices_include_tax", v)} disabled={!editable} label="Los precios incluyen ISV" />
              <div className="admin-grid-2">
                <TextField id="s-max" label="Máximo de unidades por pedido" type="number" min={1} max={500} value={String(f.max_units_per_order)}
                  onChange={(e) => set("max_units_per_order", Number(e.target.value))} />
                <TextField id="s-ttl" label="Minutos para pagar con tarjeta" type="number" min={15} max={1440} value={String(f.card_payment_ttl_minutes)}
                  onChange={(e) => set("card_payment_ttl_minutes", Number(e.target.value))} hint="Después se cancela y se libera el inventario." />
              </div>
            </div>
          </Panel>
          <Panel title="Métodos de pago">
            <div className="admin-form">
              <Switch checked={f.card_enabled} onChange={(v) => set("card_enabled", v)} disabled={!editable} label="Tarjeta de crédito o débito"
                hint={gateway ? (
                  gateway.cardProvider === "simulated" ? "Simulador de pruebas (no cobra)."
                    : gateway.mode === "test" ? "PixelPay en modo sandbox (no cobra)." : "PixelPay en producción."
                ) : "Estado de la pasarela no disponible."} />
              <Switch checked={f.transfer_enabled} onChange={(v) => set("transfer_enabled", v)} disabled={!editable} label="Transferencia bancaria"
                hint="El pedido queda pendiente hasta que alguien verifique el depósito." />
              <TextArea id="s-transfer" label="Datos para transferir" optional={!f.transfer_enabled} rows={4} value={f.transfer_instructions ?? ""}
                onChange={(e) => set("transfer_instructions", e.target.value)} maxLength={1000}
                hint="Banco, tipo y número de cuenta, titular. Se muestran al cliente después de hacer el pedido." />
              <Switch checked={f.cod_enabled} onChange={(v) => set("cod_enabled", v)} disabled={!editable} label="Pago contra entrega" />
              <TextArea id="s-cod" label="Indicaciones de pago contra entrega" optional rows={2} value={f.cod_instructions ?? ""}
                onChange={(e) => set("cod_instructions", e.target.value)} maxLength={1000} />
            </div>
          </Panel>
        </div>
        <Panel title="Pasarela de pago">
          {gateway ? (
            <dl className="admin-dl">
              <div><dt>Proveedor</dt><dd>{gateway.cardProvider === "pixelpay" ? "PixelPay" : "Simulador local"}</dd></div>
              <div><dt>Modo</dt><dd>{gateway.mode === "live" ? <Pill tone="good">Producción</Pill> : <Pill tone="warn">Pruebas</Pill>}</dd></div>
            </dl>
          ) : <p className="text-small text-warm-gray">No se pudo consultar.</p>}
          <p className="mt-4 text-[0.8125rem] text-warm-gray">
            Las credenciales de PixelPay se configuran como secretos del servidor (Supabase), nunca en este panel. Ver docs/TIENDA.md.
          </p>
        </Panel>
      </fieldset>
      {error ? <div className="mt-4"><ErrorNote message={error} /></div> : null}
      {editable ? <button type="submit" className="admin-btn admin-btn-solid mt-5" disabled={busy} aria-busy={busy}>{busy ? "Guardando…" : "Guardar ajustes"}</button> : null}
    </form>
  );
}

/* ---------------------------------------------------------------------------
 *  Envíos: remitente, zonas y transportistas
 * ------------------------------------------------------------------------- */
function ShippingTab({ data, setData }: { data: SettingsData; setData: (d: SettingsData) => void }) {
  const { can } = useAdmin();
  const editable = can("admin");
  return (
    <div className="admin-cols">
      <div className="admin-stack">
        <ZonesPanel data={data} setData={setData} editable={editable} />
        <CarriersPanel data={data} setData={setData} editable={editable} />
      </div>
      <SenderPanel data={data} setData={setData} editable={editable} />
    </div>
  );
}

function SenderPanel({ data, setData, editable }: { data: SettingsData; setData: (d: SettingsData) => void; editable: boolean }) {
  const s = data.settings;
  const [f, setF] = useState({ sender_name: s.sender_name, sender_phone: s.sender_phone ?? "", sender_address: s.sender_address ?? "", sender_city: s.sender_city ?? "", sender_department: s.sender_department ?? "" });
  const { save, busy, error } = useSave(setData);
  const missing = !s.sender_phone || !s.sender_address || !s.sender_city;
  return (
    <Panel title="Remitente de las guías">
      {missing ? <p className="admin-alert mb-4">Completa el teléfono y la dirección de origen: aparecen en cada guía.</p> : null}
      <form className="admin-form" onSubmit={(e) => { e.preventDefault(); save("admin_save_settings", f, "Remitente guardado"); }}>
        <fieldset disabled={!editable} className="admin-form">
          <TextField id="snd-name" label="Nombre" value={f.sender_name} maxLength={80} onChange={(e) => setF({ ...f, sender_name: e.target.value })} />
          <TextField id="snd-phone" label="Teléfono" value={f.sender_phone} maxLength={40} onChange={(e) => setF({ ...f, sender_phone: e.target.value })} />
          <TextArea id="snd-address" label="Dirección de origen" value={f.sender_address} maxLength={200} onChange={(e) => setF({ ...f, sender_address: e.target.value })} />
          <TextField id="snd-city" label="Ciudad" value={f.sender_city} maxLength={80} onChange={(e) => setF({ ...f, sender_city: e.target.value })} />
          <SelectField id="snd-dep" label="Departamento" value={f.sender_department} onChange={(e) => setF({ ...f, sender_department: e.target.value })}>
            <option value="">Elige…</option>
            {data.departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </SelectField>
        </fieldset>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {editable ? <div><button type="submit" className="admin-btn admin-btn-solid" disabled={busy}>Guardar remitente</button></div> : null}
      </form>
    </Panel>
  );
}

const emptyZone = (): Omit<Zone, "id"> & { id: string | null } => ({ id: null, name: "", country: "HN", departments: [], price: 0, free_over: null, estimated_days: "", is_active: true, sort_order: 0 });

function ZonesPanel({ data, setData, editable }: { data: SettingsData; setData: (d: SettingsData) => void; editable: boolean }) {
  const { me } = useAdmin();
  const [edit, setEdit] = useState<ReturnType<typeof emptyZone> | null>(null);
  const [price, setPrice] = useState("");
  const [freeOver, setFreeOver] = useState("");
  const { save, busy, error } = useSave(setData);
  const currency = me?.currency ?? "HNL";
  const taken = new Set(data.zones.filter((z) => z.is_active && z.id !== edit?.id).flatMap((z) => z.departments));

  function open(z: ReturnType<typeof emptyZone>) {
    setEdit(z);
    setPrice(z.id ? String(z.price) : "");
    setFreeOver(z.free_over === null ? "" : String(z.free_over));
  }

  return (
    <Panel title="Zonas y costos de envío" actions={editable && !edit ? <button type="button" className="admin-btn admin-btn-line" onClick={() => open(emptyZone())}>Nueva zona</button> : null}>
      {!data.zones.length && !edit ? (
        <Empty title="Sin zonas de envío">Sin zonas la tienda no puede calcular el envío. Crea al menos una zona “resto del país” (sin departamentos).</Empty>
      ) : null}
      {!edit ? (
        <div className="grid gap-3">
          {data.zones.map((z) => (
            <div key={z.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium text-charcoal">{z.name} {!z.is_active ? <Pill tone="muted">Inactiva</Pill> : null}</p>
                <p className="text-[0.8125rem] text-warm-gray">
                  {z.departments.length ? z.departments.join(", ") : "Resto del país (departamentos sin zona propia)"}
                </p>
                <p className="text-small tabular">
                  {money(z.price, currency)}{z.free_over !== null ? ` · gratis desde ${money(z.free_over, currency)}` : ""}{z.estimated_days ? ` · ${z.estimated_days}` : ""}
                </p>
              </div>
              {editable ? <button type="button" className="admin-btn admin-btn-quiet" onClick={() => open({ ...z, id: z.id })}>Editar</button> : null}
            </div>
          ))}
        </div>
      ) : (
        <form className="admin-form" onSubmit={async (e) => {
          e.preventDefault();
          if (await save("admin_save_zone", { ...edit, price, free_over: freeOver, estimated_days: edit.estimated_days || null }, "Zona guardada")) setEdit(null);
        }}>
          <TextField id="z-name" label="Nombre" value={edit.name} maxLength={80} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Distrito Central" />
          <fieldset>
            <legend className="mb-2 text-[0.8125rem] font-medium text-charcoal">Departamentos <span className="font-normal text-warm-gray">(ninguno = resto del país)</span></legend>
            <div className="admin-chips">
              {data.departments.map((d) => (
                <label key={d} className="admin-chip" style={taken.has(d) ? { opacity: 0.45 } : undefined} title={taken.has(d) ? "Ya está en otra zona activa" : undefined}>
                  <input type="checkbox" checked={edit.departments.includes(d)} disabled={taken.has(d)}
                    onChange={(e) => setEdit({ ...edit, departments: e.target.checked ? [...edit.departments, d] : edit.departments.filter((x) => x !== d) })} />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="admin-grid-2">
            <TextField id="z-price" label={`Costo de envío (${currency})`} type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            <TextField id="z-free" label="Gratis desde (subtotal)" optional type="number" min={0} step="0.01" value={freeOver} onChange={(e) => setFreeOver(e.target.value)} />
          </div>
          <TextField id="z-days" label="Plazo estimado" optional value={edit.estimated_days ?? ""} maxLength={60} onChange={(e) => setEdit({ ...edit, estimated_days: e.target.value })} placeholder="1 a 2 días hábiles" />
          <Switch checked={edit.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Activa" />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="admin-actions">
            <button type="submit" className="admin-btn admin-btn-solid" disabled={busy}>Guardar zona</button>
            <button type="button" className="admin-btn admin-btn-quiet" onClick={() => setEdit(null)}>Cancelar</button>
            {edit.id ? (
              <button type="button" className="admin-btn admin-btn-danger ml-auto" disabled={busy}
                onClick={async () => { if (await save("admin_delete_zone", { id: edit.id }, "Zona eliminada")) setEdit(null); }}>
                Eliminar zona
              </button>
            ) : null}
          </div>
        </form>
      )}
    </Panel>
  );
}

function CarriersPanel({ data, setData, editable }: { data: SettingsData; setData: (d: SettingsData) => void; editable: boolean }) {
  const [edit, setEdit] = useState<(Omit<Carrier, "id"> & { id: string | null }) | null>(null);
  const { save, busy, error } = useSave(setData);
  return (
    <Panel title="Transportistas" actions={editable && !edit ? (
      <button type="button" className="admin-btn admin-btn-line" onClick={() => setEdit({ id: null, name: "", phone: "", tracking_url: "", is_active: true })}>Agregar</button>
    ) : null}>
      {!edit ? (
        data.carriers.length ? (
          <div className="grid gap-3">
            {data.carriers.map((c) => (
              <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-charcoal">{c.name} {!c.is_active ? <Pill tone="muted">Inactiva</Pill> : null}</p>
                  <p className="text-[0.8125rem] text-warm-gray">{[c.phone, c.tracking_url ? "Con enlace de rastreo" : "Sin enlace de rastreo"].filter(Boolean).join(" · ")}</p>
                </div>
                {editable ? <button type="button" className="admin-btn admin-btn-quiet" onClick={() => setEdit({ ...c, phone: c.phone ?? "", tracking_url: c.tracking_url ?? "" })}>Editar</button> : null}
              </div>
            ))}
          </div>
        ) : <Empty title="Sin transportistas">Agrega las empresas con las que envías (por ejemplo, la que recoge en tu bodega). El número de guía se registra a mano en cada pedido.</Empty>
      ) : (
        <form className="admin-form" onSubmit={async (e) => { e.preventDefault(); if (await save("admin_save_carrier", edit, "Transportista guardada")) setEdit(null); }}>
          <TextField id="cr-name" label="Nombre" value={edit.name} maxLength={80} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <TextField id="cr-phone" label="Teléfono" optional value={edit.phone ?? ""} maxLength={40} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
          <TextField id="cr-url" label="Enlace de rastreo" optional type="url" value={edit.tracking_url ?? ""} maxLength={300}
            onChange={(e) => setEdit({ ...edit, tracking_url: e.target.value })} placeholder="https://empresa.hn/rastreo?guia={tracking}"
            hint="Escribe {tracking} donde va el número de seguimiento." />
          <Switch checked={edit.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Activa" />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="admin-actions">
            <button type="submit" className="admin-btn admin-btn-solid" disabled={busy}>Guardar</button>
            <button type="button" className="admin-btn admin-btn-quiet" onClick={() => setEdit(null)}>Cancelar</button>
          </div>
        </form>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------------------
 *  Personal (solo propietario) y bitácora
 * ------------------------------------------------------------------------- */
interface Staff { user_id: string; email: string; full_name: string | null; role: StaffRole; is_active: boolean; created_at: string }

function StaffTab() {
  const { call, me } = useAdmin();
  const notify = useToast();
  const list = useAdminData<Staff[]>("admin_list_staff");
  const [f, setF] = useState({ email: "", full_name: "", role: "staff" as StaffRole, is_active: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(args: typeof f, ok: string) {
    setBusy(true);
    setError(null);
    try {
      list.setData(await call<Staff[]>("admin_set_staff", args));
      notify(ok);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-cols">
      <Panel title="Personal con acceso" className="admin-panel-flush">
        {list.error ? <ErrorNote message={list.error} onRetry={list.reload} /> : null}
        {!list.data ? <SkeletonRows rows={3} /> : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table-cards">
              <thead><tr><th scope="col">Persona</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {list.data.map((s) => (
                  <tr key={s.user_id}>
                    <td className="card-main">{s.full_name ?? s.email}<span className="admin-sub">{s.email}</span></td>
                    <td>{ROLE_LABELS[s.role]}</td>
                    <td>{s.is_active ? <Pill tone="good">Activo</Pill> : <Pill tone="muted">Sin acceso</Pill>}</td>
                    <td className="num">
                      {s.user_id !== me?.userId ? (
                        <button type="button" className="admin-btn admin-btn-quiet" disabled={busy}
                          onClick={() => submit({ email: s.email, full_name: s.full_name ?? "", role: s.role, is_active: !s.is_active }, s.is_active ? "Acceso retirado" : "Acceso restaurado")}>
                          {s.is_active ? "Quitar acceso" : "Restaurar"}
                        </button>
                      ) : <span className="text-[0.8125rem] text-warm-gray">Tú</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title="Agregar o cambiar rol">
        <form className="admin-form" onSubmit={async (e) => {
          e.preventDefault();
          if (await submit(f, "Personal actualizado")) setF({ email: "", full_name: "", role: "staff", is_active: true });
        }}>
          <p className="text-[0.8125rem] text-ink">
            Primero invita a la persona en Supabase (Authentication → Users → Invite). Luego asígnale un rol aquí.
          </p>
          <TextField id="st-email" label="Correo" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <TextField id="st-name" label="Nombre" optional value={f.full_name} maxLength={80} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <SelectField id="st-role" label="Rol" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole })}
            hint="Personal: pedidos y envíos. Administrador: además productos, precios, ajustes y reembolsos. Propietario: todo, incluido el personal.">
            <option value="staff">{ROLE_LABELS.staff}</option>
            <option value="admin">{ROLE_LABELS.admin}</option>
            <option value="owner">{ROLE_LABELS.owner}</option>
          </SelectField>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div><button type="submit" className="admin-btn admin-btn-solid" disabled={busy}>Guardar</button></div>
        </form>
      </Panel>
    </div>
  );
}

interface AuditRow { id: number; action: string; entity: string; entity_id: string | null; details: unknown; actor_label: string | null; created_at: string }

const ACTIONS: Record<string, string> = {
  bootstrap_owner: "Propietario inicial", settings_updated: "Ajustes", product_created: "Producto creado", product_updated: "Producto editado",
  stock_adjusted: "Inventario ajustado", fragrance_saved: "Aroma", zone_saved: "Zona de envío", zone_deleted: "Zona eliminada",
  carrier_saved: "Transportista", staff_set: "Personal",
};

function AuditTab() {
  const log = useAdminData<AuditRow[]>("admin_audit_log");
  return (
    <Panel title="Últimos 200 cambios de configuración" className="admin-panel-flush">
      {log.error ? <ErrorNote message={log.error} onRetry={log.reload} /> : null}
      {!log.data ? <SkeletonRows rows={5} /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th scope="col">Fecha</th><th scope="col">Quién</th><th scope="col">Cambio</th><th scope="col">Detalle</th></tr></thead>
            <tbody>
              {log.data.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(a.created_at)}</td>
                  <td>{a.actor_label ?? "—"}</td>
                  <td>{ACTIONS[a.action] ?? a.action}</td>
                  <td>
                    {a.details ? (
                      <details className="admin-details">
                        <summary>Ver</summary>
                        <pre>{JSON.stringify(a.details, null, 2)}</pre>
                      </details>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="px-5 py-3 text-[0.8125rem] text-warm-gray">Los cambios de cada pedido quedan en su propio historial.</p>
    </Panel>
  );
}
