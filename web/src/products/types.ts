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
   * Color puramente decorativo para representar el aroma en la interfaz.
   * No describe la composición del producto.
   */
  swatch: string;
}

export interface Presentation {
  id: string;
  /** Etiqueta visible: "Galón", "500 mL"… */
  label: string;
  /** SKU interno (coincide con el sistema financiero AROMATIC). */
  sku: string;
  /**
   * Precio de venta en la moneda de `site.currency`.
   * `null` = precio aún no definido → la interfaz muestra "Consultar precio".
   */
  price: number | null;
  /**
   * Existencias disponibles. `null` = no se controla inventario todavía
   * (el producto se muestra como disponible bajo consulta).
   */
  stock: number | null;
}

/** Tipo de envase: define qué ilustración se usa mientras no haya fotografía. */
export type ContainerShape = "jug" | "pump";

export interface Product {
  id: string;
  slug: string;
  category: CategoryId;
  name: string;
  /** Nombre corto para pestañas y navegación. */
  shortName: string;
  /** Frase corta para tarjetas. */
  shortDescription: string;
  /** Descripción completa, basada en el catálogo. */
  description: string;
  fragrances: Fragrance[];
  presentations: Presentation[];
  /**
   * Ruta de la fotografía del producto dentro de /public (por ejemplo
   * "/images/products/suavizante.jpg"). Mientras sea `null` se muestra la
   * ilustración de envase definida por `visual`.
   */
  image: string | null;
  /** Dirección de arte para la ilustración provisional y los fondos. */
  visual: {
    shape: ContainerShape;
    /** Texto corto impreso en la etiqueta de la ilustración. */
    label: string;
    /** Color del líquido / envase. */
    tint: string;
    /** Color de fondo de la tarjeta. */
    backdrop: string;
  };
}
