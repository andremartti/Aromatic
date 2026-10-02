import { useId } from "react";
import type { ContainerShape } from "@/products/types";

/**
 * Ilustración de envase AROMATIC.
 *
 * Se usa mientras no existan fotografías oficiales. Es deliberadamente una
 * ilustración (no simula una fotografía) y se reemplaza sola cuando el
 * producto define `image` en src/products/products.ts.
 *
 * El galón sigue la forma real del envase del catálogo (asa a la izquierda,
 * tapa a la derecha, costillas laterales). La etiqueta del envase repite el
 * sistema de etiquetas de la web: papel marfil, doble filete y dos tintas.
 */
interface BottleProps {
  shape: ContainerShape;
  /** Color del líquido (decorativo). */
  tint: string;
  /** Nombre corto del producto impreso en la etiqueta. */
  name: string;
  /** Línea inferior de la etiqueta (aroma o presentación). */
  detail?: string;
  className?: string;
  /** Sombra de contacto con la superficie. */
  shadow?: boolean;
}

export function Bottle({ shape, tint, name, detail, className, shadow = true }: BottleProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const props = { uid, tint, name, detail, shadow };
  return (
    <svg
      viewBox={shape === "pump" ? "0 0 150 300" : "0 0 240 300"}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {shape === "pump" ? <Pump {...props} /> : <Jug {...props} />}
    </svg>
  );
}

interface ShapeProps {
  uid: string;
  tint: string;
  name: string;
  detail?: string;
  shadow: boolean;
}

function Shading({ uid, tint }: { uid: string; tint: string }) {
  return (
    <defs>
      {/* Luz de estudio desde la izquierda */}
      <linearGradient id={`light-${uid}`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#5a4a38" stopOpacity="0.14" />
        <stop offset="0.12" stopColor="#ffffff" stopOpacity="0.5" />
        <stop offset="0.24" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="0.82" stopColor="#5a4a38" stopOpacity="0.04" />
        <stop offset="1" stopColor="#3d3127" stopOpacity="0.3" />
      </linearGradient>
      {/* style (no atributo) para aceptar variables CSS como tinte */}
      <linearGradient id={`liquid-${uid}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" style={{ stopColor: tint }} />
        <stop offset="1" style={{ stopColor: tint, stopOpacity: 0.82 }} />
      </linearGradient>
      <linearGradient id={`cap-${uid}`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#2e2b28" />
        <stop offset="0.28" stopColor="#5a554f" />
        <stop offset="0.5" stopColor="#262422" />
        <stop offset="1" stopColor="#161513" />
      </linearGradient>
      <radialGradient id={`floor-${uid}`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#3b2e22" stopOpacity="0.32" />
        <stop offset="1" stopColor="#3b2e22" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/**
 * Reparte el nombre en líneas de hasta `max` caracteres (sin cortar palabras)
 * y, si no cabe en `maxLines`, termina la última línea con "…".
 */
function wrapName(name: string, max: number, maxLines: number): string[] {
  const lines: string[] = [];
  for (const word of name.split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, max - 1)}…`;
  return kept;
}

/** Etiqueta impresa: papel marfil, doble filete, AROMATIC + producto + detalle. */
function PrintedLabel({
  x,
  y,
  w,
  h,
  name,
  detail,
  scale = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  detail?: string;
  scale?: number;
}) {
  const cx = x + w / 2;
  const lines = wrapName(name, 13, 3);
  const fontSize = (lines.length > 2 ? 12.5 : 15) * scale;
  const lineHeight = fontSize * 1.06;
  const nameY = y + h * 0.5 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.25;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6 * scale} fill="#f8f3eb" />
      <rect
        x={x + 5 * scale}
        y={y + 5 * scale}
        width={w - 10 * scale}
        height={h - 10 * scale}
        rx={3.5 * scale}
        fill="none"
        stroke="#b59d7b"
        strokeOpacity="0.7"
        strokeWidth={0.7}
      />
      <rect
        x={x + 7.5 * scale}
        y={y + 7.5 * scale}
        width={w - 15 * scale}
        height={h - 15 * scale}
        rx={2.5 * scale}
        fill="none"
        stroke="#b59d7b"
        strokeOpacity="0.45"
        strokeWidth={0.5}
      />
      <text
        x={cx}
        y={y + 26 * scale}
        textAnchor="middle"
        fill="#1f1d1b"
        style={{ fontFamily: "var(--font-sans)", fontStretch: "125%" }}
        fontSize={9.5 * scale}
        fontWeight={500}
        letterSpacing={1.6 * scale}
      >
        AROMATIC
      </text>
      <line
        x1={cx - 9 * scale}
        x2={cx + 9 * scale}
        y1={y + 33 * scale}
        y2={y + 33 * scale}
        stroke="#b59d7b"
        strokeWidth={0.7}
      />
      <text
        textAnchor="middle"
        fill="#1f1d1b"
        style={{ fontFamily: "var(--font-display)" }}
        fontSize={fontSize}
      >
        {lines.map((line, i) => (
          <tspan key={`${i}-${line}`} x={cx} y={nameY + i * lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
      {detail ? (
        <text
          x={cx}
          y={y + h - 16 * scale}
          textAnchor="middle"
          fill="#5c554d"
          style={{ fontFamily: "var(--font-sans)", fontStretch: "125%" }}
          fontSize={5.6 * scale}
          fontWeight={600}
          letterSpacing={1.2 * scale}
        >
          {detail.toUpperCase()}
        </text>
      ) : null}
    </g>
  );
}

function Jug({ uid, tint, name, detail, shadow }: ShapeProps) {
  // Galón: asa abierta arriba a la izquierda, cuello y tapa arriba a la derecha.
  const body =
    "M36 290 C26 290 22 284 22 274 L22 74 C22 52 34 40 56 40 L150 40 C156 40 160 38 162 34 L198 34 C200 40 206 46 212 54 C216 60 218 66 218 74 L218 274 C218 284 214 290 204 290 Z";
  return (
    <>
      <Shading uid={uid} tint={tint} />
      <defs>
        <clipPath id={`jug-${uid}`}>
          <path d={body} />
        </clipPath>
        <mask id={`handle-${uid}`}>
          <rect width="240" height="300" fill="#fff" />
          <rect x="42" y="54" width="94" height="44" rx="21" fill="#000" />
        </mask>
      </defs>
      {shadow ? <ellipse cx="120" cy="291" rx="112" ry="7" fill={`url(#floor-${uid})`} /> : null}
      {/* Cuello y tapa */}
      <rect x="164" y="22" width="32" height="14" fill="#efe9df" />
      <rect x="158" y="2" width="44" height="24" rx="4" fill={`url(#cap-${uid})`} />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={165 + i * 7.5} x2={165 + i * 7.5} y1="6" y2="22" stroke="#ffffff" strokeOpacity="0.09" />
      ))}
      <g mask={`url(#handle-${uid})`}>
        {/* Envase: plástico claro arriba, líquido abajo (como en el catálogo) */}
        <g clipPath={`url(#jug-${uid})`}>
          <rect x="0" y="0" width="240" height="300" fill="#f3eee6" />
          <rect x="0" y="108" width="240" height="192" fill={`url(#liquid-${uid})`} />
          <rect x="0" y="106" width="240" height="3" fill="#ffffff" opacity="0.55" />
          {/* Costillas laterales */}
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i} stroke="#3d3127" strokeOpacity="0.1" strokeWidth="1.2">
              <line x1="22" x2="36" y1={136 + i * 12} y2={136 + i * 12} />
              <line x1="204" x2="218" y1={136 + i * 12} y2={136 + i * 12} />
            </g>
          ))}
          <rect x="0" y="0" width="240" height="300" fill={`url(#light-${uid})`} />
        </g>
        <path d={body} fill="none" stroke="#3d3127" strokeOpacity="0.16" strokeWidth="1.2" />
        <rect x="42" y="54" width="94" height="44" rx="21" fill="none" stroke="#3d3127" strokeOpacity="0.14" strokeWidth="5" />
      </g>
      <PrintedLabel x={50} y={128} w={140} h={136} name={name} detail={detail} />
    </>
  );
}

function Pump({ uid, tint, name, detail, shadow }: ShapeProps) {
  const body =
    "M30 290 C20 290 14 284 14 272 L14 136 C14 112 30 100 54 94 L58 80 L92 80 L96 94 C120 100 136 112 136 136 L136 272 C136 284 130 290 120 290 Z";
  return (
    <>
      <Shading uid={uid} tint={tint} />
      <defs>
        <clipPath id={`pump-${uid}`}>
          <path d={body} />
        </clipPath>
      </defs>
      {shadow ? <ellipse cx="75" cy="291" rx="70" ry="6" fill={`url(#floor-${uid})`} /> : null}
      {/* Dosificador */}
      <path d="M58 26 L18 26 C12 26 10 30 10 34 L10 36 L20 36 L20 34 L58 34 Z" fill={`url(#cap-${uid})`} />
      <rect x="56" y="18" width="40" height="20" rx="4" fill={`url(#cap-${uid})`} />
      <rect x="70" y="38" width="12" height="28" fill="#33302c" />
      <rect x="52" y="62" width="46" height="20" rx="4" fill={`url(#cap-${uid})`} />
      <g clipPath={`url(#pump-${uid})`}>
        <rect x="0" y="0" width="150" height="300" fill="#f3eee6" />
        <rect x="0" y="122" width="150" height="178" fill={`url(#liquid-${uid})`} />
        <rect x="0" y="120" width="150" height="3" fill="#ffffff" opacity="0.55" />
        <rect x="0" y="0" width="150" height="300" fill={`url(#light-${uid})`} />
      </g>
      <path d={body} fill="none" stroke="#3d3127" strokeOpacity="0.16" strokeWidth="1.2" />
      <PrintedLabel x={26} y={150} w={98} h={114} name={name} detail={detail} scale={0.78} />
    </>
  );
}
