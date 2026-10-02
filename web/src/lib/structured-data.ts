/**
 * Datos estructurados (schema.org) con información real únicamente.
 * Sin precios ni ofertas: `features.prices` está desactivado y los precios
 * no se publican en ningún formato.
 */
import { SITE_URL, site } from "@/config/site";
import { getCategory } from "@/products/products";
import { SCENE } from "@/config/scene";
import type { Product } from "@/products/types";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: `${SITE_URL}/`,
    slogan: site.tagline,
    description: site.description,
    areaServed: { "@type": "City", name: site.city },
    address: { "@type": "PostalAddress", addressLocality: site.city, addressCountry: "HN" },
    sameAs: site.social.map((s) => s.url).filter(Boolean),
  };
}

export function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: `${SITE_URL}/productos/${product.slug}/`,
    brand: { "@type": "Brand", name: site.name },
    category: getCategory(product.category)?.name,
    // Fotografía oficial: recorte del producto si existe; si no, la escena.
    image: `${SITE_URL}${product.cutouts ? Object.values(product.cutouts)[0] : SCENE.sharp.fallback}`,
    description: product.summary,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Aroma", value: product.fragrances.map((f) => f.name).join(", ") },
      { "@type": "PropertyValue", name: "Presentación", value: product.presentations.map((p) => p.label).join(", ") },
    ],
  };
}
