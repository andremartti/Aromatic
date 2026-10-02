/**
 * Configuración general del sitio AROMATIC.
 * Todo lo que la marca necesita ajustar sin tocar componentes vive aquí.
 */

/**
 * WHATSAPP_NUMBER
 * Número de WhatsApp en formato internacional, SOLO dígitos (código de país +
 * número). Se toma de NEXT_PUBLIC_WHATSAPP_NUMBER (en GitHub: variable de
 * repositorio WHATSAPP_NUMBER). Mientras esté vacío, los botones abren WhatsApp
 * con el mensaje escrito y el cliente elige el contacto. Nunca use un número
 * de prueba.
 */
export const WHATSAPP_NUMBER: string = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

/** URL pública del sitio (sin barra final): canonical, Open Graph, sitemap, JSON-LD. */
export const SITE_URL: string = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://andremartti.github.io/Aromatic").replace(
  /\/+$/,
  "",
);

export const site = {
  name: "AROMATIC",
  /** Principio de marca (texto proporcionado por AROMATIC). */
  tagline: "Limpieza que se ve, suavidad que se siente y fragancia que permanece.",
  description:
    "AROMATIC: suavizante, detergente líquido y jabón líquido. Limpieza que se ve, suavidad que se siente y fragancia que permanece.",
  /** Ciudad donde se venden los productos (dato confirmado por la marca). */
  city: "Tegucigalpa",
  country: "Honduras",
  locale: "es-HN",
  /** Moneda, usada solo si `features.prices` se activa. */
  currency: { code: "HNL", locale: "es-HN" },
  /**
   * Datos de contacto y redes. Vacío = no se muestra en ninguna parte.
   * Complete solo con datos oficiales.
   */
  contact: { email: "", phoneDisplay: "", address: "" },
  social: [
    { id: "instagram", label: "Instagram", url: "" },
    { id: "facebook", label: "Facebook", url: "" },
    { id: "tiktok", label: "TikTok", url: "" },
  ],
} as const;

/**
 * Interruptores de funcionalidades.
 * prices: false → ningún precio se muestra (web, WhatsApp, metadatos, JSON-LD),
 * aunque los datos tengan `price`. Para publicarlos, cargue `price` en
 * src/products/products.ts y cambie este valor a `true`.
 */
export const features = {
  prices: false,
} as const;
