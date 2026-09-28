import { useId } from "react";
import type { ContainerShape } from "@/products/types";

/**
 * Ilustración vectorial de envase AROMATIC.
 * Se usa mientras no existan fotografías oficiales: es claramente una
 * ilustración (no simula una fotografía) y se reemplaza automáticamente
 * cuando el producto define `image` en src/products/products.ts.
 */
interface BottleProps {
  shape: ContainerShape;
  tint: string;
  label: string;
  className?: string;
  /** Muestra la sombra de contacto con la superficie. */
  shadow?: boolean;
}

export function Bottle({ shape, tint, label, className, shadow = true }: BottleProps) {
  const uid = useId().replace(/:/g, "");
  return shape === "pump" ? (
    <PumpBottle uid={uid} tint={tint} label={label} className={className} shadow={shadow} />
  ) : (
    <Jug uid={uid} tint={tint} label={label} className={className} shadow={shadow} />
  );
}

interface ShapeProps {
  uid: string;
  tint: string;
  label: string;
  className?: string;
  shadow: boolean;
}

function Defs({ uid, tint }: { uid: string; tint: string }) {
  return (
    <>
      {/* Cuerpo: luz de estudio desde la izquierda */}
      <linearGradient id={`body-${uid}`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={tint} stopOpacity="0.92" />
        <stop offset="0.18" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="0.32" stopColor={tint} stopOpacity="0.96" />
        <stop offset="0.78" stopColor={tint} />
        <stop offset="1" stopColor="#6e6356" stopOpacity="0.55" />
      </linearGradient>
      <linearGradient id={`shade-${uid}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.25" />
        <stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="1" stopColor="#3a332c" stopOpacity="0.16" />
      </linearGradient>
      <linearGradient id={`cap-${uid}`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#3b3733" />
        <stop offset="0.3" stopColor="#6b655e" />
        <stop offset="0.55" stopColor="#2a2724" />
        <stop offset="1" stopColor="#1a1816" />
      </linearGradient>
      <linearGradient id={`label-${uid}`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#f6f1ea" />
        <stop offset="0.25" stopColor="#fdfbf8" />
        <stop offset="1" stopColor="#e9e1d5" />
      </linearGradient>
      <radialGradient id={`floor-${uid}`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#1f1d1b" stopOpacity="0.28" />
        <stop offset="1" stopColor="#1f1d1b" stopOpacity="0" />
      </radialGradient>
    </>
  );
}

function LabelText({ x, y, width, label, scale = 1 }: { x: number; y: number; width: number; label: string; scale?: number }) {
  const cx = x + width / 2;
  return (
    <g fill="#2b2825" textAnchor="middle">
      <text
        x={cx}
        y={y}
        fontFamily="var(--font-serif)"
        fontSize={15 * scale}
        letterSpacing={3.6 * scale}
        fontWeight={500}
      >
        AROMATIC
      </text>
      <line x1={cx - 10 * scale} x2={cx + 10 * scale} y1={y + 10 * scale} y2={y + 10 * scale} stroke="#b9a383" strokeWidth={0.8} />
      <text
        x={cx}
        y={y + 24 * scale}
        fontFamily="var(--font-sans)"
        fontSize={5.6 * scale}
        letterSpacing={1.8 * scale}
        fontWeight={600}
        fill="#5f5952"
      >
        {label.toUpperCase()}
      </text>
    </g>
  );
}

function Jug({ uid, tint, label, className, shadow }: ShapeProps) {
  const body =
    "M40 92 C40 70 54 60 78 60 L152 60 C194 60 212 74 212 104 L212 284 C212 300 202 308 186 308 L56 308 C40 308 32 300 32 284 L32 106 C32 98 35 94 40 92 Z";
  return (
    <svg viewBox="0 0 244 330" className={className} role="img" aria-hidden="true">
      <defs>
        <Defs uid={uid} tint={tint} />
        <mask id={`handle-${uid}`}>
          <rect width="244" height="330" fill="#fff" />
          <rect x="150" y="84" width="42" height="64" rx="19" fill="#000" />
        </mask>
      </defs>
      {shadow && <ellipse cx="122" cy="312" rx="100" ry="10" fill={`url(#floor-${uid})`} />}
      {/* Tapa */}
      <rect x="62" y="44" width="36" height="20" fill={tint} />
      <rect x="56" y="16" width="48" height="32" rx="6" fill={`url(#cap-${uid})`} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={62 + i * 7} x2={62 + i * 7} y1="20" y2="44" stroke="#ffffff" strokeOpacity="0.08" />
      ))}
      {/* Cuerpo */}
      <g mask={`url(#handle-${uid})`}>
        <path d={body} fill={`url(#body-${uid})`} />
        <path d={body} fill={`url(#shade-${uid})`} />
        <rect x="150" y="84" width="42" height="64" rx="19" fill="none" stroke="#3a332c" strokeOpacity="0.14" strokeWidth="6" />
      </g>
      <path d={body} fill="none" stroke="#3a332c" strokeOpacity="0.12" />
      {/* Brillo vertical */}
      <rect x="44" y="104" width="10" height="186" rx="5" fill="#ffffff" opacity="0.35" />
      {/* Etiqueta */}
      <rect x="54" y="168" width="136" height="112" rx="4" fill={`url(#label-${uid})`} />
      <rect x="54" y="168" width="136" height="112" rx="4" fill="none" stroke="#3a332c" strokeOpacity="0.06" />
      <LabelText x={54} y={216} width={136} label={label} />
    </svg>
  );
}

function PumpBottle({ uid, tint, label, className, shadow }: ShapeProps) {
  const body =
    "M34 120 C34 98 52 90 82 90 C112 90 130 98 130 120 L130 292 C130 304 122 310 110 310 L54 310 C42 310 34 304 34 292 Z";
  return (
    <svg viewBox="0 0 164 330" className={className} role="img" aria-hidden="true">
      <defs>
        <Defs uid={uid} tint={tint} />
      </defs>
      {shadow && <ellipse cx="82" cy="314" rx="66" ry="8" fill={`url(#floor-${uid})`} />}
      {/* Dosificador */}
      <path d="M96 30 L132 30 Q140 30 140 38 L140 44 L130 44 L130 40 L96 40 Z" fill={`url(#cap-${uid})`} />
      <rect x="66" y="24" width="32" height="20" rx="4" fill={`url(#cap-${uid})`} />
      <rect x="75" y="44" width="14" height="26" fill="#3b3733" />
      <rect x="62" y="68" width="40" height="24" rx="5" fill={`url(#cap-${uid})`} />
      {/* Cuerpo */}
      <path d={body} fill={`url(#body-${uid})`} />
      <path d={body} fill={`url(#shade-${uid})`} />
      <path d={body} fill="none" stroke="#3a332c" strokeOpacity="0.12" />
      <rect x="44" y="124" width="8" height="170" rx="4" fill="#ffffff" opacity="0.38" />
      {/* Etiqueta */}
      <rect x="46" y="176" width="72" height="100" rx="3" fill={`url(#label-${uid})`} />
      <LabelText x={46} y={218} width={72} label={label} scale={0.62} />
    </svg>
  );
}
