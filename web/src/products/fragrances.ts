import type { Fragrance } from "./types";

/**
 * Aromas disponibles según el catálogo AROMATIC.
 * Los colores (`swatch`) son solo una representación visual en la web.
 */
export const FRAGRANCES = {
  floral: { id: "floral", name: "Floral", swatch: "#E8D5D8" },
  chicle: { id: "chicle", name: "Chicle", swatch: "#EFD3DF" },
  frutasTropicales: { id: "frutas-tropicales", name: "Frutas tropicales", swatch: "#F1DCC0" },
  coco: { id: "coco", name: "Coco", swatch: "#EDE6DA" },
  cherry: { id: "cherry", name: "Cherry", swatch: "#E3C4C4" },
  fresh: { id: "fresh", name: "Fresh", swatch: "#D5E2DC" },
} as const satisfies Record<string, Fragrance>;
