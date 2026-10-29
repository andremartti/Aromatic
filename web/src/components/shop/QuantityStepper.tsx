"use client";

import { Minus } from "@phosphor-icons/react/dist/ssr/Minus";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

/** Selector de cantidad accesible (botones de 44 px + campo numérico). */
export function QuantityStepper({ value, max, onChange, label }: QuantityStepperProps) {
  const set = (n: number) => onChange(Math.max(1, Math.min(max, Number.isFinite(n) ? Math.round(n) : 1)));
  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} aria-label="Quitar una unidad">
        <Minus size={14} aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        aria-label="Cantidad"
        className="tabular"
      />
      <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label="Agregar una unidad">
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
