/**
 * Modelo de datos del catálogo AROMATIC.
 *
 * Está pensado para crecer: cada producto tiene presentaciones (variantes) con
 * su propio precio, SKU e inventario, de modo que el mismo modelo sirva más
 * adelante para un carrito, un checkout o una conexión con inventario.
 */

export type CategoryId = "suavizante" | "detergente" | "jabon-manos";

export interface Category {
  id: CategoryId;
  /** Nombre visible de la categoría. */
  name: string;
}

export interface Fragrance {
  id: string;
  /** Nombre del aroma tal como aparece en el catálogo. */
  name: string;
  /**
   * Tinte puramente decorativo (variable CSS del design system) para
   * representar el aroma en la interfaz. No describe la composición.
   */
  tint: string;
}

export interface Presentation {
  id: string;
  /** Etiqueta visible: "Galón", "500 mL"… */
  label: string;
  /** SKU interno (coincide con el sistema financiero AROMATIC). */
  sku: string;
  /**
   * Precio de venta en la moneda de `site.currency`.
   * `null` = precio no definido. Aunque tenga valor, solo se muestra si
   * `features.prices` está activo en src/config/site.ts.
   */
  price: number | null;
  /**
   * Existencias disponibles. `null` = no se controla inventario todavía
   * (la disponibilidad se confirma por WhatsApp).
   */
  stock: number | null;
}

/** Tipo de envase: define qué ilustración se usa mientras no haya fotografía. */
export type ContainerShape = "jug" | "pump";

export interface Product {
  id: string;
  slug: string;
  category: CategoryId;
  /** Nombre completo, siempre con la marca: "AROMATIC Suavizante". */
  name: string;
  /** Nombre del producto sin la marca, para etiquetas y navegación. */
  shortName: string;
  /** Frase corta para tarjetas (derivada de la descripción del catálogo). */
  shortDescription: string;
  /** Descripción completa, tal como aparece en el catálogo. */
  description: string;
  fragrances: Fragrance[];
  presentations: Presentation[];
  /**
   * Ruta de la fotografía del producto dentro de /public (por ejemplo
   * "/images/products/suavizante.jpg"). Mientras sea `null` se muestra la
   * ilustración de envase definida por `visual`.
   */
  image: string | null;
  /** Texto alternativo de la fotografía cuando exista. */
  imageAlt?: string;
  /** Producto destacado: ocupa la etiqueta grande en la vitrina. */
  featured?: boolean;
  /** Dirección de arte para la ilustración provisional. */
  visual: {
    shape: ContainerShape;
    /** Envase por presentación cuando cambia (id de presentación → forma). */
    shapeByPresentation?: Record<string, ContainerShape>;
    /** Color del líquido en la ilustración (decorativo). */
    tint: string;
  };
}
