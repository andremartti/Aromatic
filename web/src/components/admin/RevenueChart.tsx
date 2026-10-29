"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { money } from "@/lib/shop/money";

export interface RevenuePoint {
  key: string;
  label: string;
  /** Etiqueta completa para el tooltip y la tabla. */
  longLabel: string;
  revenue: number;
  orders: number;
}

const H = 220;
const M = { top: 14, right: 8, bottom: 26, left: 52 };
const BAR = "#a87c36"; // dorado de la etiqueta con croma suficiente (validado contra la superficie)
const BAR_ACTIVE = "#24201d";

/** 0, 250, 1500, 1 mil, 2.5 mil… para los ejes. */
function compact(v: number): string {
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)} M`;
  if (v >= 1000) return `${+(v / 1000).toFixed(1)} mil`;
  return String(Math.round(v));
}

function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Columna con la punta redondeada (4 px) y base recta. */
function columnPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Ingresos por periodo: una sola serie (el título la nombra, sin leyenda).
 * Tooltip al pasar el puntero y con las flechas del teclado; tabla equivalente
 * para lectores de pantalla y para quien prefiera los números.
 */
export function RevenueChart({ data, currency, title, description }: { data: RevenuePoint[]; currency: string; title: string; description: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const descId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = niceMax(Math.max(0, ...data.map((d) => d.revenue)));
  const innerW = width - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const band = innerW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(24, band - 2));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(44 / band));
  const empty = data.every((d) => d.revenue === 0);
  const y = (v: number) => M.top + innerH - (v / max) * innerH;

  function onPointer(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width - M.left;
    const i = Math.floor(x / band);
    setActive(i >= 0 && i < data.length ? i : null);
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const last = data.length - 1;
    setActive((a) => {
      if (e.key === "Home") return 0;
      if (e.key === "End") return last;
      const cur = a ?? last;
      return e.key === "ArrowLeft" ? Math.max(0, cur - 1) : Math.min(last, cur + 1);
    });
  }

  const point = active !== null ? data[active] : null;
  const tipX = active !== null ? M.left + band * active + band / 2 : 0;
  const tipY = point ? y(point.revenue) : 0;

  return (
    <div>
      <div
        ref={wrapRef}
        className="admin-chart"
        tabIndex={0}
        role="group"
        aria-label={`${title}. Usa las flechas izquierda y derecha para recorrer los valores.`}
        aria-describedby={descId}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        <p id={descId} className="sr-only">{description}</p>
        <svg
          viewBox={`0 0 ${width} ${H}`}
          width={width}
          height={H}
          aria-hidden="true"
          onPointerMove={onPointer}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="#e7ddcf" strokeWidth={1} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#5f574f" style={{ fontVariantNumeric: "tabular-nums" }}>
                {compact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = M.left + band * i + (band - barW) / 2;
            const h = innerH - (y(d.revenue) - M.top);
            return (
              <g key={d.key}>
                <path d={columnPath(x, y(d.revenue), barW, h)} fill={active === i ? BAR_ACTIVE : BAR} />
                {i % labelEvery === (data.length - 1) % labelEvery ? (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#5f574f">{d.label}</text>
                ) : null}
              </g>
            );
          })}
          <line x1={M.left} x2={width - M.right} y1={M.top + innerH} y2={M.top + innerH} stroke="#cfc2b0" strokeWidth={1} />
          {empty ? (
            <text x={M.left + innerW / 2} y={M.top + innerH / 2} textAnchor="middle" fontSize={13} fill="#5f574f">
              Todavía no hay ventas pagadas en este periodo
            </text>
          ) : null}
        </svg>
        {point ? (
          <div className="admin-chart-tip" style={{ left: `${(tipX / width) * 100}%`, top: tipY }}>
            <strong className="block text-[0.9375rem]">{money(point.revenue, currency)}</strong>
            <span className="opacity-80">{point.longLabel} · {point.orders} {point.orders === 1 ? "pedido" : "pedidos"}</span>
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {point ? `${point.longLabel}: ${money(point.revenue, currency)}, ${point.orders} pedidos` : ""}
        </p>
      </div>
      <button type="button" className="admin-btn admin-btn-quiet mt-2" aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>
        {showTable ? "Ocultar tabla" : "Ver como tabla"}
      </button>
      {showTable ? (
        <div className="admin-table-wrap mt-2">
          <table className="admin-table">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr><th scope="col">Periodo</th><th scope="col" className="num">Pedidos</th><th scope="col" className="num">Ingresos</th></tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key}><td>{d.longLabel}</td><td className="num">{d.orders}</td><td className="num">{money(d.revenue, currency)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
