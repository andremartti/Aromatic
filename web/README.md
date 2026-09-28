# AROMATIC — Sitio web

Sitio oficial de AROMATIC: home care premium. Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion.

```bash
cd web
npm install
npm run dev        # desarrollo → http://localhost:3000
npm run build      # genera el sitio estático en web/out/
npm run lint && npm run typecheck
```

`npm run build` produce HTML/CSS/JS puros en `out/`: se publica en Vercel, Netlify,
Cloudflare Pages, GitHub Pages o cualquier hosting, sin servidor.

## Lo que se edita sin tocar diseño

| Qué | Dónde |
|---|---|
| Productos, descripciones, aromas, presentaciones, **precios**, imágenes | `src/products/products.ts` |
| Colores decorativos de cada aroma | `src/products/fragrances.ts` |
| Número de WhatsApp | variable `NEXT_PUBLIC_WHATSAPP_NUMBER` (ver `.env.example`) → `WHATSAPP_NUMBER` en `src/config/site.ts` |
| Redes sociales, moneda, eslogan | `src/config/site.ts` |
| Menú | `src/config/navigation.ts` |

### Precios
Cada presentación tiene su propio `price`. Hoy todos están en `null` y la web muestra
**"Consultar precio"**. Al escribir un número (`price: 185`) aparece formateado en lempiras
(`L 185.00`) en la tarjeta, el detalle y el mensaje de WhatsApp. Los precios del catálogo impreso
no se cargaron a propósito: son una referencia antigua.

### WhatsApp
Cree `web/.env.local` con `NEXT_PUBLIC_WHATSAPP_NUMBER=504XXXXXXXX` (solo dígitos, con código de
país) y vuelva a compilar. Mientras esté vacío, los botones abren WhatsApp con el pedido ya escrito
y el cliente elige el contacto: nunca se usa un número inventado.

### Fotografías
Hoy los envases se muestran como **ilustraciones vectoriales** (no simulan fotografías oficiales).
Para usar fotos reales: copie el archivo a `public/images/products/` y escriba la ruta en `image`
del producto (`image: "/images/products/suavizante.png"`). Recomendado: PNG con fondo transparente,
vertical, ~1600 px de alto. Todas las secciones cambian solas.

### Redes sociales
En `site.social` deje la URL vacía hasta tener la cuenta oficial; los enlaces sin URL no se
muestran. Al completarlas aparecen en el pie de página.

### Nuevos productos
Agregue la categoría en `CATEGORIES` y el producto en `PRODUCTS`. Tarjetas, detalle, página propia
(`/productos/<slug>/`), sección de aromas y WhatsApp se generan automáticamente.

## Arquitectura

```
src/
  app/                     rutas: inicio, /productos/[slug], 404
  components/
    Navbar  Hero  ExperienceSection  ProductShowcase  ProductCard
    ProductModal  ProductDetail  FragranceSection  BrandSection
    PremiumExperience  WhatsAppButton  Footer  RelatedProducts
    Bottle / ProductVisual  → ilustración o fotografía (un solo punto de decisión)
    motion.tsx              → Reveal, RevealText (animaciones reutilizables)
  products/                datos del catálogo (fuente única)
  lib/
    commerce.ts            capa de comercio (hoy WhatsApp)
    format.ts  whatsapp.ts
  config/                  sitio y navegación
```

**Preparado para ecommerce.** `lib/commerce.ts` define la interfaz `CommerceProvider`
(`availability`, `checkoutUrl`) y el tipo `CartLine`. Cada presentación ya tiene `sku`, `price` y
`stock`. Para conectar carrito, checkout, pagos o inventario se implementa otro proveedor y se
reemplaza `commerce`: los componentes no cambian. Con `stock: 0` el botón pasa a "Agotado"
automáticamente. Si hiciera falta backend, se quita `output: "export"` de `next.config.ts`.

## Calidad verificada

- Compila sin errores (`build`, `lint`, `typecheck`).
- Auditoría automática de accesibilidad (axe, WCAG 2 A/AA): 0 incidencias en inicio (escritorio y
  móvil), modal y página de producto.
- Navegación por teclado: menú y modal con foco atrapado, cierre con Escape y retorno del foco.
- Respeta "reducir movimiento" del sistema operativo.
- Probado a 390 px (móvil), 820 px (tablet), 1024, 1280 y 1440 px.
- Solo tres productos (Suavizante, Detergente líquido, Jabón líquido) y solo los aromas del catálogo.
- Sin testimonios, cifras, premios ni certificaciones inventadas.
