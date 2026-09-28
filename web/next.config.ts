import type { NextConfig } from "next";

/**
 * Ruta base del sitio. Vacía en desarrollo y en dominios propios; "/Aromatic"
 * al publicarse en GitHub Pages (https://andremartti.github.io/Aromatic/).
 * La define el flujo .github/workflows/deploy-web.yml.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Exportación estática: el sitio se genera como HTML/CSS/JS puro en `out/`
 * y puede publicarse en cualquier hosting (GitHub Pages, Vercel, Netlify,
 * Cloudflare Pages o un servidor propio) sin necesidad de un servidor Node.
 *
 * Cuando exista un backend de ecommerce (carrito, pagos, inventario) basta con
 * eliminar `output: "export"` para habilitar rutas de servidor de Next.js.
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
