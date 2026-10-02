/**
 * ============================================================================
 *  CATÁLOGO AROMATIC · ARCHIVO ÚNICO DE DATOS
 * ============================================================================
 *  Productos, aromas, presentaciones, precios e imágenes se editan aquí.
 *  Ningún componente contiene datos de producto propios.
 *
 *  PRECIOS: hoy no se publican (`features.prices = false` en
 *  src/config/site.ts). Para activarlos, escriba `price` en cada presentación
 *  y active el interruptor. Los precios del catálogo impreso NO se cargaron.
 *
 *  IMÁGENES: la escena fotográfica oficial vive en src/config/scene.ts. Cada
 *  producto define su encuadre (`scene.shot`), su zona (`scene.box`) y su
 *  máscara de foco. `cutouts` lista fotos recortadas por aroma (solo cambia el
 *  color del líquido; la etiqueta es la original).
 * ============================================================================
 */
import { FRAGRANCES } from "./fragrances";
import type { Category, CategoryId, Fragrance, Product } from "./types";

export const CATEGORIES: Category[] = [
  { id: "suavizante", name: "Suavizante" },
  { id: "detergente", name: "Detergente líquido para lavadora" },
  { id: "jabon-manos", name: "Jabón líquido para manos" },
];

export const PRODUCTS: Product[] = [
  {
    id: "suavizante",
    slug: "suavizante",
    category: "suavizante",
    name: "AROMATIC Suavizante",
    shortName: "Suavizante",
    heroWord: "Suavizante",
    use: "Para la ropa",
    summary: "Producto enfocado en aportar suavidad y una agradable fragancia a las prendas.",
    description:
      "Suavizante líquido perfumado que proporciona sensación de suavidad y frescura, con un perfume agradable, sutil y duradero. También facilita el planchado.",
    fragrances: [FRAGRANCES.floral],
    presentations: [{ id: "galon", label: "Galón", sku: "SUA-GAL", price: null, stock: null }],
    scene: {
      shot: { cx: 167, cy: 738, z: 760 },
      box: { x: 30, y: 395, w: 278, h: 688 },
      mask: "/images/scene/mask-suavizante.png",
    },
  },
  {
    id: "detergente",
    slug: "detergente-liquido",
    category: "detergente",
    name: "AROMATIC Detergente Líquido",
    shortName: "Detergente Líquido",
    heroWord: "Detergente",
    use: "Para la lavadora",
    summary: "Detergente líquido para lavadora orientado a limpieza, frescura y cuidado de las prendas.",
    description:
      "Detergente líquido para lavadora, apto para todo tipo de ropa, con un agradable y duradero aroma. Su fórmula está enriquecida con jabón natural para ayudar a cuidar y alargar la vida de las prendas.",
    fragrances: [FRAGRANCES.floral],
    presentations: [{ id: "galon", label: "Galón", sku: "DET-GAL", price: null, stock: null }],
    scene: {
      shot: { cx: 421, cy: 732, z: 770 },
      box: { x: 283, y: 380, w: 217, h: 700 },
      mask: "/images/scene/mask-detergente.png",
    },
    featured: true,
  },
  {
    id: "jabon-manos",
    slug: "jabon-liquido",
    category: "jabon-manos",
    name: "AROMATIC Jabón Líquido",
    shortName: "Jabón Líquido",
    heroWord: "Jabón",
    use: "Para las manos",
    summary: "Jabón líquido para la limpieza de manos, en seis aromas y tres presentaciones.",
    description:
      "Jabón líquido especialmente formulado para la limpieza de manos, con propiedades que ayudan a suavizar y humectar la piel.",
    fragrances: [
      FRAGRANCES.chicle,
      FRAGRANCES.floral,
      FRAGRANCES.frutasTropicales,
      FRAGRANCES.coco,
      FRAGRANCES.cherry,
      FRAGRANCES.fresh,
    ],
    presentations: [
      { id: "500ml", label: "500 mL", sku: "JAB-500", price: null, stock: null },
      { id: "2l", label: "2 Litros", sku: "JAB-2L", price: null, stock: null },
      { id: "galon", label: "Galón", sku: "JAB-GAL", price: null, stock: null },
    ],
    scene: {
      shot: { cx: 598, cy: 872, z: 560 },
      box: { x: 503, y: 645, w: 190, h: 456 },
      mask: "/images/scene/mask-jabon.png",
    },
    cutouts: {
      chicle: "/images/jabon/jabon-chicle.webp",
      floral: "/images/jabon/jabon-floral.webp",
      "frutas-tropicales": "/images/jabon/jabon-frutas-tropicales.webp",
      coco: "/images/jabon/jabon-coco.webp",
      cherry: "/images/jabon/jabon-cherry.webp",
      fresh: "/images/jabon/jabon-fresh.webp",
    },
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getCategory(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/** Todos los aromas del catálogo, sin repetir. */
export function allFragrances(): Fragrance[] {
  const seen = new Map<string, Fragrance>();
  for (const product of PRODUCTS) for (const f of product.fragrances) if (!seen.has(f.id)) seen.set(f.id, f);
  return [...seen.values()];
}

export function productsWithFragrance(fragranceId: string): Product[] {
  return PRODUCTS.filter((p) => p.fragrances.some((f) => f.id === fragranceId));
}
