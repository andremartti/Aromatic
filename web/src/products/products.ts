/**
 * ============================================================================
 *  CATÁLOGO AROMATIC · ARCHIVO ÚNICO DE DATOS
 * ============================================================================
 *
 *  Aquí se editan TODOS los productos, precios, aromas, presentaciones e
 *  imágenes. Ningún componente contiene datos de producto propios.
 *
 *  PRECIOS
 *  - Hoy NO se publican precios: `features.prices` es `false` en
 *    src/config/site.ts y ningún precio se muestra, aunque exista.
 *  - Para publicarlos: escriba `price` en cada presentación (número en HNL) y
 *    active `features.prices`. Las tarjetas, el detalle y el mensaje de
 *    WhatsApp los mostrarán sin cambiar componentes.
 *  - Los precios del catálogo impreso son una referencia antigua y NO se
 *    cargaron aquí a propósito.
 *
 *  FOTOGRAFÍAS
 *  - Copie la foto a /public/images/products/ y ponga la ruta en `image`,
 *    por ejemplo: image: "/images/products/suavizante.jpg", y describa la
 *    foto en `imageAlt`.
 *  - Mientras `image` sea null se muestra una ilustración del envase.
 *
 *  NUEVOS PRODUCTOS
 *  - Agregue la categoría en CATEGORIES y un objeto nuevo en PRODUCTS.
 *    Toda la web (etiquetas, detalle, aromas, WhatsApp, sitemap) se actualiza.
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
    shortDescription: "Suavidad y frescura con un perfume sutil y duradero.",
    description:
      "Suavizante líquido perfumado que proporciona sensación de suavidad y frescura, con un perfume agradable, sutil y duradero. También facilita el planchado.",
    fragrances: [FRAGRANCES.floral],
    presentations: [{ id: "galon", label: "Galón", sku: "SUA-GAL", price: null, stock: null }],
    image: null,
    visual: { shape: "jug", tint: "#e8d4cc" },
  },
  {
    id: "detergente",
    slug: "detergente-liquido",
    category: "detergente",
    name: "AROMATIC Detergente Líquido",
    shortName: "Detergente líquido",
    shortDescription: "Para todo tipo de ropa, enriquecido con jabón natural.",
    description:
      "Detergente líquido para lavadora, apto para todo tipo de ropa, con un agradable y duradero aroma. Su fórmula está enriquecida con jabón natural para ayudar a cuidar y alargar la vida de las prendas.",
    fragrances: [FRAGRANCES.floral],
    presentations: [{ id: "galon", label: "Galón", sku: "DET-GAL", price: null, stock: null }],
    image: null,
    visual: { shape: "jug", tint: "#d5ddd2" },
  },
  {
    id: "jabon-manos",
    slug: "jabon-liquido",
    category: "jabon-manos",
    name: "AROMATIC Jabón Líquido",
    shortName: "Jabón líquido",
    shortDescription: "Limpieza de manos que ayuda a suavizar y humectar la piel.",
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
    image: null,
    featured: true,
    // El catálogo muestra el galón con el mismo envase del suavizante.
    visual: { shape: "pump", shapeByPresentation: { galon: "jug" }, tint: "#ead9c6" },
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getCategory(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/** Todos los aromas del catálogo, sin repetir, en orden de aparición. */
export function allFragrances(): Fragrance[] {
  const seen = new Map<string, Fragrance>();
  for (const product of PRODUCTS) {
    for (const fragrance of product.fragrances) {
      if (!seen.has(fragrance.id)) seen.set(fragrance.id, fragrance);
    }
  }
  return [...seen.values()];
}

/** Productos que se ofrecen en un aroma. */
export function productsWithFragrance(fragranceId: string): Product[] {
  return PRODUCTS.filter((p) => p.fragrances.some((f) => f.id === fragranceId));
}
