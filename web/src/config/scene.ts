/**
 * Escena fotográfica oficial de AROMATIC (los tres productos sobre mármol).
 *
 * La fotografía se usa intacta: no se recortan ni rediseñan etiquetas. La web
 * mueve una "cámara" sobre ella y cambia el foco entre productos con máscaras
 * de recorte (una por producto) sobre una versión desenfocada de la misma foto.
 * Las coordenadas están en píxeles de la foto original (720 × 1440).
 *
 * Archivos en /public/images/scene/ (ver web/design-assets/README.md).
 */
export const SCENE = {
  width: 720,
  height: 1440,
  /** Versión nítida (ampliada 3× sin alterar contenido), por ancho. */
  sharp: {
    avif: [
      { src: "/images/scene/scene-1440.avif", w: 1440 },
      { src: "/images/scene/scene-2160.avif", w: 2160 },
    ],
    webp: [
      { src: "/images/scene/scene-1440.webp", w: 1440 },
      { src: "/images/scene/scene-2160.webp", w: 2160 },
    ],
    fallback: "/images/scene/scene-1440.jpg",
  },
  /** Misma foto desenfocada: fondo de la profundidad de campo. */
  blur: { webp: "/images/scene/scene-blur.webp", fallback: "/images/scene/scene-blur.jpg" },
  alt: "AROMATIC Suavizante, AROMATIC Detergente Líquido y AROMATIC Jabón Líquido sobre una superficie de mármol, con cortina de lino y pétalos blancos.",
} as const;

/** Encuadre de cámara: centro (cx, cy) y alto visible (z) en px de la foto. */
export interface Shot {
  cx: number;
  cy: number;
  z: number;
}

/** Zona del producto en la foto (para el botón de selección). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
