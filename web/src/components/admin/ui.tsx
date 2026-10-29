"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useEffectEvent, useState, type ReactNode } from "react";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/config/shop";
import { ApiError } from "@/lib/shop/api";
import { useAdmin } from "./AdminProvider";

/* ---------------------------------------------------------------------------
 *  Datos: carga una función del panel y la vuelve a pedir al cambiar los
 *  argumentos. `setData` permite usar la respuesta de una acción (las funciones
 *  de escritura devuelven el registro actualizado) sin otra consulta.
 * ------------------------------------------------------------------------- */
export function useAdminData<T>(fn: string | null, args: Record<string, unknown> = {}) {
  const { call } = useAdmin();
  const [nonce, setNonce] = useState(0);
  const argsKey = JSON.stringify(args);
  const reqKey = `${fn}|${argsKey}|${nonce}`;
  // Mientras llega una respuesta nueva se conserva la anterior (la vista no salta).
  const [res, setRes] = useState<{ key: string; data: T | null; error: string | null } | null>(null);
  const fetchData = useEffectEvent((name: string, payload: Record<string, unknown>) => call<T>(name, payload));

  useEffect(() => {
    if (!fn) return;
    let alive = true;
    fetchData(fn, JSON.parse(argsKey))
      .then((data) => alive && setRes({ key: reqKey, data, error: null }))
      .catch((err) => alive && setRes((r) => ({ key: reqKey, data: r?.data ?? null, error: errorMessage(err) })));
    return () => {
      alive = false;
    };
  }, [fn, argsKey, reqKey]);

  return {
    data: res?.data ?? null,
    error: res?.key === reqKey ? res.error : null,
    loading: Boolean(fn) && res?.key !== reqKey,
    reload: useCallback(() => setNonce((n) => n + 1), []),
    setData: useCallback((data: T) => setRes({ key: reqKey, data, error: null }), [reqKey]),
  };
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

/* ---------------------------------------------------------------------------
 *  Avisos breves (guardado, error) en una región aria-live.
 * ------------------------------------------------------------------------- */
type Toast = { id: number; message: string; tone: "good" | "bad" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((message: string, tone: Toast["tone"] = "good") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "bad" ? 7000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="admin-toasts no-print" aria-live="polite" role="status">
        {toasts.map((t) => (
          <p key={t.id} className="admin-toast" data-tone={t.tone}>{t.message}</p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------------------------------------------------------------------------
 *  Formatos
 * ------------------------------------------------------------------------- */
const TZ = "America/Tegucigalpa";
const dateTime = new Intl.DateTimeFormat("es-HN", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("es-HN", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });

export const fmtDateTime = (v: string | null | undefined) => (v ? dateTime.format(new Date(v)) : "—");
export const fmtDate = (v: string | null | undefined) => (v ? dateOnly.format(new Date(v)) : "—");

/** +50499991234 → 9999-1234 (Honduras) o el número tal cual. */
export function fmtPhone(v: string | null | undefined): string {
  if (!v) return "—";
  const m = /^\+504(\d{4})(\d{4})$/.exec(v);
  return m ? `${m[1]}-${m[2]}` : v;
}

export const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

/* ---------------------------------------------------------------------------
 *  Estados
 * ------------------------------------------------------------------------- */
export type Tone = "good" | "bad" | "warn" | "info" | "muted";

const ORDER_TONES: Record<string, Tone> = {
  pending: "warn", confirmed: "info", preparing: "info", ready_to_ship: "info",
  shipped: "info", delivered: "good", cancelled: "bad", returned: "bad",
};
const PAYMENT_TONES: Record<string, Tone> = {
  pending: "warn", awaiting_verification: "warn", approved: "good",
  declined: "bad", cancelled: "muted", refunded: "muted",
};

export function Pill({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return <span className="admin-pill" data-tone={tone}>{children}</span>;
}
export const OrderStatus = ({ value }: { value: string }) => (
  <Pill tone={ORDER_TONES[value]}>{ORDER_STATUS_LABELS[value] ?? value}</Pill>
);
export const PaymentStatus = ({ value }: { value: string }) => (
  <Pill tone={PAYMENT_TONES[value]}>{PAYMENT_STATUS_LABELS[value] ?? value}</Pill>
);
export const METHOD_SHORT: Record<string, string> = { card: "Tarjeta", bank_transfer: "Transferencia", cash_on_delivery: "Contra entrega" };
export const methodLabel = (v: string) => PAYMENT_METHOD_LABELS[v] ?? v;

/* ---------------------------------------------------------------------------
 *  Estructura
 * ------------------------------------------------------------------------- */
export function PageHead({ title, back, children, meta }: { title: ReactNode; back?: { href: string; label: string }; children?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="admin-head">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="admin-back">← {back.label}</Link>
        ) : null}
        <h1 className="admin-title">{title}</h1>
        {meta ? <div className="admin-head-meta">{meta}</div> : null}
      </div>
      {children ? <div className="admin-head-actions">{children}</div> : null}
    </header>
  );
}

export function Panel({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`admin-panel ${className}`}>
      {title || actions ? (
        <div className="admin-panel-head">
          {title ? <h2 className="admin-panel-title">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="admin-error" role="alert">
      <p>{message}</p>
      {onRetry ? <button type="button" className="admin-btn admin-btn-quiet" onClick={onRetry}>Reintentar</button> : null}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="admin-empty">
      <p className="admin-empty-title">{title}</p>
      {children ? <div className="admin-empty-body">{children}</div> : null}
    </div>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="admin-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <span key={i} />)}
    </div>
  );
}

/** Interruptor accesible (checkbox con aspecto de switch). */
export function Switch({ checked, onChange, label, disabled, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean; hint?: ReactNode }) {
  return (
    <label className="admin-switch" data-disabled={disabled ? "" : undefined}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="admin-switch-track" aria-hidden="true" />
      <span className="admin-switch-text">
        {label}
        {hint ? <span className="admin-switch-hint">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Copia un texto y confirma con un aviso. */
export function CopyButton({ text, label = "Copiar", done = "Copiado" }: { text: string; label?: string; done?: string }) {
  const notify = useToast();
  return (
    <button
      type="button"
      className="admin-btn admin-btn-quiet"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          notify(done);
        } catch {
          notify("No se pudo copiar. Selecciona el texto manualmente.", "bad");
        }
      }}
    >
      {label}
    </button>
  );
}

/** Descarga filas como CSV (UTF-8 con BOM para que Excel respete las tildes). */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Evita que Excel interprete el contenido como fórmula.
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
    return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const todayStamp = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
