# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hogares de Tegucigalpa (Honduras) que compran productos de limpieza y cuidado del hogar para uso diario.
Descubren AROMATIC en la web (o por un enlace compartido) y concretan la compra por WhatsApp.
Su trabajo: elegir producto, aroma y presentación, y pedirlo sin fricción desde el teléfono.
La mayoría llega desde un móvil.

## Product Purpose

AROMATIC es una marca hondureña de productos de limpieza y cuidado personal. El sitio web es su
vitrina: presenta los productos con nivel de marca premium de home care y convierte la visita en
una conversación de compra por WhatsApp. Éxito = el visitante entiende qué producto le sirve, elige
aroma y presentación, y abre WhatsApp con el pedido ya escrito.

## Positioning

Productos de limpieza de uso diario presentados como una experiencia sensorial: limpieza, suavidad
y fragancia. La diferencia que AROMATIC comunica es el aroma y el cuidado, no el precio ni la
cantidad de productos.

## Operating Context

- Venta directa a hogares por WhatsApp. No hay ecommerce, carrito ni pagos en línea todavía.
- Mercado: Tegucigalpa, Honduras (venta local). Idioma: español. Moneda (cuando se activen precios): lempiras (HNL).
- Sitio publicado en GitHub Pages: https://andremartti.github.io/Aromatic/

## Capabilities and Constraints

- Catálogo del sitio limitado a tres productos (fuente: catálogo AROMATIC 2016):
  - **Aromatic Suavizante** — aroma Floral — Galón.
  - **Aromatic Detergente Líquido** (para lavadora) — aroma Floral — Galón.
  - **Aromatic Jabón Líquido** (para manos) — aromas Chicle, Floral, Frutas tropicales, Coco,
    Cherry, Fresh — 500 mL, 2 Litros, Galón.
- El catálogo contiene más productos; no se publican hasta nueva instrucción. El sitio debe poder
  crecer a más productos sin rehacer componentes.
- **Precios: no se muestran.** Los precios del catálogo no son definitivos. El dato `price` existe
  en el modelo como `null` y la interfaz no lo renderiza hasta que se active. Nunca en tarjetas,
  detalle, metadatos, SEO ni datos estructurados.
- Número de WhatsApp sin definir: variable `WHATSAPP_NUMBER`. Nunca inventar uno.
- Redes sociales (Instagram, Facebook, TikTok) sin URL todavía. Nunca inventarlas.
- Stack existente: Next.js (exportación estática), TypeScript, Tailwind CSS, Motion (motion/react).

## Brand Commitments

- El nombre es siempre **AROMATIC** (los productos se llaman "Aromatic Suavizante", etc.).
- Frases de marca confirmadas por el dueño:
  - "El cuidado que se siente. La fragancia que permanece."
  - "Calidad que se siente. Fragancia que permanece."
  - "Productos premium para transformar cada momento de limpieza en una experiencia de frescura,
    suavidad y aroma."
  - "Más que limpieza." / "Una nueva forma de entender la limpieza." /
    "Tu hogar también merece sentirse especial."
- Línea del catálogo 2016: "Creados para mantener hogares limpios y frescos."
- Posicionamiento deseado: marca premium de home care / lifestyle. No debe parecer tienda genérica,
  plantilla, ecommerce genérico ni el catálogo PDF pasado a HTML.

## Evidence on Hand

- Catálogo AROMATIC 2016 (PDF): descripciones, aromas y presentaciones de los tres productos.
- Fotografías del catálogo: galones de suavizante, detergente y jabón, ≈400×700 px, etiquetas
  antiguas y colores saturados. No aptas como imagen principal; no hay fotografías nuevas todavía.
  El sitio usa ilustraciones provisionales reemplazables por fotos reales.
- **No existen y no deben inventarse:** testimonios, clientes, estadísticas, premios,
  certificaciones, años de experiencia, laboratorios, ingredientes, claims médicos o ecológicos,
  posición de mercado, precios.

## Product Principles

1. Solo lo que el catálogo o el dueño respaldan se presenta como hecho.
2. Cada visita debe poder terminar en un pedido por WhatsApp desde el teléfono.
3. El aroma es el protagonista del relato de marca: elegirlo debe ser claro y agradable.
4. Crecer sin rehacer: productos, aromas, presentaciones, precios e imágenes viven en un solo lugar.

## Accessibility & Inclusion

WCAG 2.1 AA. Navegación completa por teclado, objetivos táctiles amplios, respeto a
`prefers-reduced-motion`. Uso mayoritario en móvil, a menudo con una mano.
