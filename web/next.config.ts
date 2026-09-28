import type { NextConfig } from "next";

/**
 * Exportación estática: el sitio se genera como HTML/CSS/JS puro en `out/`
 * y puede publicarse en cualquier hosting (Vercel, Netlify, Cloudflare Pages,
 * GitHub Pages o un servidor propio) sin necesidad de un servidor Node.
 *
 * Cuando exista un backend de ecommerce (carrito, pagos, inventario) basta con
 * eliminar `output: "export"` para habilitar rutas de servidor de Next.js.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
