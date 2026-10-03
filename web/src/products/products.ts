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
 *  IMÁGENES: fotos oficiales recortadas en /public/images/products/
 *  (`image`). `cutouts` lista la foto del jabón por aroma: solo cambia el
 *  color del líquido; la etiqueta es la original.
 * ============================================================================
 */
import { FRAGRANCES } from "./fragrances";
import type { Category, CategoryId, Fragrance, Product, ProductPhoto } from "./types";

export const CATEGORIES: Category[] = [
  { id: "suavizante", name: "Suavizante" },
  { id: "detergente", name: "Detergente líquido para lavadora" },
  { id: "jabon-manos", name: "Jabón líquido para manos" },
];

/** Foto del jabón líquido por aroma (misma toma, color de líquido distinto). */
const JABON = (aroma: string): ProductPhoto => ({ base: `/images/products/jabon-${aroma}`, ratio: 850 / 1778 });

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
    image: { base: "/images/products/suavizante", ratio: 868 / 1734 },
    stature: 1,
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
    image: { base: "/images/products/detergente", ratio: 1068 / 1964 },
    stature: 1.06,
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
    image: JABON("frutas-tropicales"),
    stature: 0.74,
    cutouts: {
      chicle: JABON("chicle"),
      floral: JABON("floral"),
      "frutas-tropicales": JABON("frutas-tropicales"),
      coco: JABON("coco"),
      cherry: JABON("cherry"),
      fresh: JABON("fresh"),
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

/** Foto del producto para un aroma (o la principal). */
export function photoFor(product: Product, fragranceId?: string): ProductPhoto {
  return (fragranceId && product.cutouts?.[fragranceId]) || product.image;
}
