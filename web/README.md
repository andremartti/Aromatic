# AROMATIC: sitio web

Sitio oficial de AROMATIC: productos premium de cuidado del hogar. Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Motion.

```bash
cd web
npm install
npm run dev        # desarrollo → http://localhost:3000
npm run build      # genera el sitio estático en web/out/
npm run lint && npm run typecheck
```

`npm run build` produce HTML/CSS/JS puros en `out/`: se publica en cualquier hosting, sin servidor.

## Publicación (GitHub Pages)

El flujo `.github/workflows/deploy-web.yml` publica la web en
**https://andremartti.github.io/Aromatic/** cada vez que llegan cambios de `web/` a `main`.
En los pull requests solo compila y verifica.

- **WhatsApp en producción:** Settings → Secrets and variables → Actions → *Variables* →
  `WHATSAPP_NUMBER` (solo dígitos, con código de país). Luego Actions → "Publicar sitio web" → *Run workflow*.
- **Dominio propio:** Settings → Pages → *Custom domain*. Con dominio propio la web vive en la raíz:
  en el flujo cambie `NEXT_PUBLIC_BASE_PATH` a vacío y `NEXT_PUBLIC_SITE_URL` al dominio.

## Lo que se edita sin tocar diseño

| Qué | Dónde |
|---|---|
| Productos, descripciones, aromas, presentaciones, precios, encuadre en la escena | `src/products/products.ts` |
| Fotografía de escena (rutas, texto alternativo) | `src/config/scene.ts` |
| Tinte decorativo de cada aroma | `src/products/fragrances.ts` (tokens en `src/app/globals.css`) |
| Mostrar u ocultar precios | `features.prices` en `src/config/site.ts` |
| Número de WhatsApp (`WHATSAPP_NUMBER`) | local: `NEXT_PUBLIC_WHATSAPP_NUMBER` en `web/.env.local` · publicado: variable de repositorio `WHATSAPP_NUMBER` |
| Redes sociales, ciudad, eslogan, URL del sitio | `src/config/site.ts` |
| Menú | `src/config/navigation.ts` |
| Colores, tipografía, espaciado, radios, sombras, motion, breakpoints | tokens en `src/app/globals.css` (documentados en `/DESIGN.md`) |

### Precios (hoy ocultos)
Los precios del catálogo impreso no son definitivos y **no se muestran en ninguna parte**: ni en
etiquetas, detalle, hero, mensajes de WhatsApp, metadatos, sitemap ni datos estructurados.
Cada presentación tiene `price: null`. Para publicarlos:

1. Escriba el precio en cada presentación (`price: 185`, en lempiras).
2. Cambie `features.prices` a `true` en `src/config/site.ts`.

El componente `PriceTag` y el mensaje de WhatsApp los mostrarán formateados (`L 185.00`) sin
cambiar ningún otro componente. Mientras `features.prices` sea `false`, ningún precio se imprime
aunque exista en los datos.

### WhatsApp
Cree `web/.env.local` con `NEXT_PUBLIC_WHATSAPP_NUMBER=` seguido del número (solo dígitos, con
código de país) y vuelva a compilar. Mientras esté vacío, los botones abren WhatsApp con el pedido
ya escrito y el cliente elige el contacto: nunca se usa un número inventado.

### Fotografías
La web usa **una sola fotografía oficial** (los tres productos juntos) como escena. Cada producto
define en `products.ts` un encuadre `scene.shot` (`cx`, `cy`, `z`, en píxeles de la foto original de
720×1440), una caja `scene.box` y una máscara `scene.mask`. La "cámara" encuadra, enfoca ese
producto y desenfoca los demás. Las etiquetas nunca se redibujan; solo el líquido del jabón cambia
de color para cada aroma (`cutouts`). El proceso y la procedencia de cada imagen están en
`design-assets/README.md`.

Cuando exista una sesión de fotos oficial: reemplace los archivos de `public/images/scene/` con los
mismos nombres, regenere las máscaras y ajuste `shot` y `box` de cada producto.

### Redes sociales
En `site.social` deje la URL vacía hasta tener la cuenta oficial; los enlaces sin URL no se
muestran. Al completarlas aparecen en el pie de página y en los datos estructurados.

### Nuevos productos
Agregue la categoría en `CATEGORIES` y el producto en `PRODUCTS`. Como el hero recorre una sola
fotografía, el producto nuevo debe aparecer en esa foto (o en una nueva escena) con su `shot`, su
`box` y su máscara. `featured: true` marca el producto enfocado al cargar. La página propia
(`/productos/<slug>/`), "Encuentra tu aroma", el formulario de solicitud, el sitemap y WhatsApp se
generan solos. Revise los textos editoriales (por ejemplo, "Seis aromas para el jabón líquido") si
el catálogo cambia.

## Arquitectura

```
src/
  app/
    layout.tsx  page.tsx  template.tsx (transición de página)  not-found.tsx
    productos/[slug]/page.tsx  robots.ts  sitemap.ts  fonts.ts  globals.css (design tokens)
  components/
    Navbar  ProductUniverse (hero + descubrimiento)  SceneStage (cámara sobre la foto)
    ExperienceSection  FragranceSection  EditorialSection  OrderSlip  Footer
    ProductDetail  PriceTag  WhatsAppButton  CtaZone  RevealObserver  JsonLd  icons.tsx
  products/      datos del catálogo (fuente única)
  lib/
    commerce.ts  capa de comercio (hoy WhatsApp)
    format.ts    precios (respeta features.prices), listas
    whatsapp.ts  structured-data.ts  asset.ts
  config/        sitio, escena, funcionalidades y navegación
design-assets/   foto original y proceso de imagen (no se publica)
```

**Preparado para ecommerce.** `lib/commerce.ts` define la interfaz `CommerceProvider`
(`availability`, `checkoutUrl`) y el tipo `CartLine`. Cada presentación ya tiene `sku`, `price` y
`stock`. Para conectar carrito, checkout, pagos o inventario se implementa otro proveedor y se
reemplaza `commerce`: los componentes no cambian. Con `stock: 0` el detalle muestra "Agotado".
Si hiciera falta backend, se quita `output: "export"` de `next.config.ts`.

**Motion (AROMATIC FLOW).** Curva `cubic-bezier(.22,1,.36,1)`. La entrada del hero es CSS
(12 pasos). La cámara de la escena es una transición `layout` de Motion. El desplazamiento de la
escena en escritorio y la narración de "Más que limpieza." están ligados al scroll. Los revelados de
sección ocurren una sola vez con un único IntersectionObserver. Todo respeta "reducir movimiento"
y el contenido es visible sin JavaScript.

## Calidad verificada

- `build`, `lint` y `typecheck` sin errores.
- Revisión visual en 1440, 1280, 1024, 768, 430, 390 y 375 px. Sin desbordamiento horizontal.
- axe (WCAG 2 A/AA + buenas prácticas) en inicio y en las tres fichas de producto, en escritorio y en móvil.
- Navegación por teclado con foco visible; menú móvil con foco atrapado, Escape y retorno del foco.
- Laterales del hero, selector y swipe en móvil probados; sin errores de consola.
- Solo tres productos y solo los aromas y presentaciones del catálogo; ningún precio visible.
