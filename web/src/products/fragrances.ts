import type { Fragrance } from "./types";

/**
 * Aromas oficiales de AROMATIC.
 * `tint` apunta a un token decorativo (src/app/globals.css) usado en la atmósfera.
 */
export const FRAGRANCES = {
  chicle: { id: "chicle", name: "Chicle", tint: "var(--color-aroma-chicle)" },
  floral: { id: "floral", name: "Floral", tint: "var(--color-aroma-floral)" },
  frutasTropicales: { id: "frutas-tropicales", name: "Frutas tropicales", tint: "var(--color-aroma-tropical)" },
  coco: { id: "coco", name: "Coco", tint: "var(--color-aroma-coco)" },
  cherry: { id: "cherry", name: "Cherry", tint: "var(--color-aroma-cherry)" },
  fresh: { id: "fresh", name: "Fresh", tint: "var(--color-aroma-fresh)" },
} as const satisfies Record<string, Fragrance>;
