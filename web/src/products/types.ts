/**
 * Modelo de datos del catálogo AROMATIC.
 * Cada producto tiene presentaciones (variantes) con su propio precio, SKU e
 * inventario, para servir más adelante a un carrito o una conexión con inventario.
 */
import type { Box, Shot } from "@/config/scene";

export type CategoryId = "suavizante" | "detergente" | "jabon-manos";

export interface Category {
  id: CategoryId;
  name: string;
}

export interface Fragrance {
  id: string;
  /** Nombre del aroma tal como lo indica la marca. */
  name: string;
  /** Tinte decorativo de la atmósfera (variable CSS). No describe la composición. */
  tint: string;
}

export interface Presentation {
  id: string;
  label: string;
  /** SKU interno (coincide con el sistema financiero AROMATIC). */
  sku: string;
  /**
   * Precio en la moneda de `site.currency`. `null` = no definido. Aunque tenga
   * valor, solo se muestra si `features.prices` está activo (src/config/site.ts).
   */
  price: number | null;
  /** Existencias. `null` = no se controla inventario todavía. */
  stock: number | null;
}

export interface Product {
  id: string;
  slug: string;
  category: CategoryId;
  /** Nombre completo, siempre con la marca: "AROMATIC Suavizante". */
  name: string;
  /** Nombre sin la marca. */
  shortName: string;
  /** Palabra grande del universo de producto. */
  heroWord: string;
  /** Rótulo corto del uso (dato, no adorno). */
  use: string;
  /** Descripción oficial breve. */
  summary: string;
  /** Descripción completa (catálogo). */
  description: string;
  fragrances: Fragrance[];
  presentations: Presentation[];
  /** Encuadre de cámara y zona del producto en la escena fotográfica. */
  scene: { shot: Shot; box: Box; mask: string };
  /**
   * Fotografía recortada del producto por aroma (id de aroma → ruta en /public).
   * Solo cambia el color del líquido; la etiqueta es la original.
   * Si un aroma no tiene foto, se usa la escena.
   */
  cutouts?: Record<string, string>;
  /** Producto destacado en el primer encuadre. */
  featured?: boolean;
}
