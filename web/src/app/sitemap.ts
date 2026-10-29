import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { PRODUCTS } from "@/products/products";
import { shopConfigured } from "@/config/shop";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    ...(shopConfigured ? [{ url: `${SITE_URL}/tienda/`, changeFrequency: "weekly" as const, priority: 0.9 }] : []),
    ...PRODUCTS.map((p) => ({
      url: `${SITE_URL}/productos/${p.slug}/`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
