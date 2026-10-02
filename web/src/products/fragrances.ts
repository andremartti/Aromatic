import type { Fragrance } from "./types";

/**
 * Aromas disponibles según el catálogo AROMATIC.
 * `tint` apunta a un token de color decorativo del design system
 * (src/app/globals.css); no describe la composición del producto.
 */
export const FRAGRANCES = {
  floral: { id: "floral", name: "Floral", tint: "var(--color-aroma-floral)" },
  chicle: { id: "chicle", name: "Chicle", tint: "var(--color-aroma-chicle)" },
  frutasTropicales: { id: "frutas-tropicales", name: "Frutas tropicales", tint: "var(--color-aroma-tropical)" },
  coco: { id: "coco", name: "Coco", tint: "var(--color-aroma-coco)" },
  cherry: { id: "cherry", name: "Cherry", tint: "var(--color-aroma-cherry)" },
  fresh: { id: "fresh", name: "Fresh", tint: "var(--color-aroma-fresh)" },
} as const satisfies Record<string, Fragrance>;
