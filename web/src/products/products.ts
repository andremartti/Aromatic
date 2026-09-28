/**
 * ============================================================================
 *  CATÁLOGO AROMATIC — ARCHIVO ÚNICO DE DATOS
 * ============================================================================
 *
 *  Aquí se editan TODOS los productos, precios, aromas, presentaciones e
 *  imágenes. Ningún componente contiene precios ni datos de producto propios.
 *
 *  PRECIOS
 *  - `price: null`  → la web muestra "Consultar precio".
 *  - `price: 123.45` → la web muestra el precio con el formato de moneda
 *                     configurado en src/config/site.ts.
 *  Los precios del catálogo impreso son solo una referencia antigua y NO se
 *  cargaron aquí a propósito: escriba los precios reales cuando estén definidos.
 *
 *  FOTOGRAFÍAS
 *  - Copie la foto a /public/images/products/ y ponga la ruta en `image`,
 *    por ejemplo: image: "/images/products/suavizante.jpg".
 *  - Mientras `image` sea null se muestra una ilustración del envase.
 *
 *  NUEVOS PRODUCTOS
 *  - Agregue la categoría en CATEGORIES y un objeto nuevo en PRODUCTS.
 *    Toda la web (tarjetas, detalle, aromas, WhatsApp) se actualiza sola.
 * ============================================================================
 */

import { FRAGRANCES } from "./fragrances";
import type { Category, CategoryId, Product } from "./types";

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
    name: "Aromatic Suavizante",
    shortName: "Suavizante",
    shortDescription: "Suavidad y frescura con un perfume sutil y duradero.",
    description:
      "Suavizante líquido perfumado que proporciona sensación de suavidad y frescura, con un perfume agradable, sutil y duradero. También facilita el planchado.",
    fragrances: [FRAGRANCES.floral],
    presentations: [{ id: "galon", label: "Galón", sku: "SUA-GAL", price: null, stock: null }],
    image: null,
    visual: { shape: "jug", label: "Suavizante", tint: "#E6D3C0", backdrop: "#F3EDE4" },
  },
  {
    id: "detergente",
    slug: "detergente-liquido",
    category: "detergente",
    name: "Aromatic Detergente Líquido",
    shortName: "Detergente",
    shortDescription: "Para todo tipo de ropa, enriquecido con jabón natural.",
    description:
      "Detergente líquido para lavadora, apto para todo tipo de ropa, con un agradable y duradero aroma. Su fórmula está enriquecida con jabón natural para ayudar a cuidar y alargar la vida de las prendas.",
    fragrances: [FRAGRANCES.floral],
    presentations: [{ id: "galon", label: "Galón", sku: "DET-GAL", price: null, stock: null }],
    image: null,
    visual: { shape: "jug", label: "Detergente líquido", tint: "#C9D3C8", backdrop: "#ECEFE9" },
  },
  {
    id: "jabon-manos",
    slug: "jabon-liquido",
    category: "jabon-manos",
    name: "Aromatic Jabón Líquido",
    shortName: "Jabón líquido",
    shortDescription: "Limpieza para tus manos que ayuda a suavizar y humectar la piel.",
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
    visual: { shape: "pump", label: "Jabón líquido", tint: "#E9DCCB", backdrop: "#F5F0E8" },
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getCategory(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
