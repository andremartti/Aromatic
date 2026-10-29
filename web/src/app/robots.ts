import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function robots(): MetadataRoute.Robots {
  return {
    // El panel, el pago y los pedidos no se indexan (el enlace de un pedido es privado).
    rules: { userAgent: "*", allow: `${BASE}/`, disallow: ["/admin/", "/checkout/", "/pedido/"].map((p) => `${BASE}${p}`) },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
