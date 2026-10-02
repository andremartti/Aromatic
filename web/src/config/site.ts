/**
 * Configuración general del sitio AROMATIC.
 * Todo lo que la marca necesita ajustar sin tocar componentes vive aquí.
 */

/**
 * WHATSAPP_NUMBER
 * Número de WhatsApp en formato internacional, SOLO dígitos (código de país +
 * número). Se toma de la variable de entorno NEXT_PUBLIC_WHATSAPP_NUMBER
 * (ver .env.example y la variable WHATSAPP_NUMBER del workflow de GitHub).
 *
 * Mientras esté vacío, los botones abren WhatsApp con el mensaje ya escrito
 * y el cliente elige el contacto. Nunca escriba aquí un número de prueba.
 */
export const WHATSAPP_NUMBER: string = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

/**
 * URL pública del sitio (sin barra final). Se usa para canonical, Open Graph,
 * sitemap y datos estructurados. Se define en el build con NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL: string = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://andremartti.github.io/Aromatic").replace(
  /\/+$/,
  "",
);

export const site = {
  name: "AROMATIC",
  tagline: "Calidad que se siente. Fragancia que permanece.",
  headline: ["El cuidado que se siente.", "La fragancia que permanece."],
  description:
    "Productos premium para transformar cada momento de limpieza en una experiencia de frescura, suavidad y aroma.",
  /** Ciudad donde se venden los productos (dato confirmado por la marca). */
  city: "Tegucigalpa",
  country: "Honduras",
  locale: "es-HN",
  /** Formato de precios, usado solo cuando `features.prices` está activo. */
  currency: { code: "HNL", locale: "es-HN" },
  /**
   * Redes sociales. Deje la URL vacía hasta tener la cuenta oficial:
   * los enlaces sin URL no se muestran en ninguna parte.
   */
  social: [
    { id: "instagram", label: "Instagram", url: "" },
    { id: "facebook", label: "Facebook", url: "" },
    { id: "tiktok", label: "TikTok", url: "" },
  ],
} as const;

/**
 * Interruptores de funcionalidades.
 *
 * prices: false → ningún precio se muestra en la web, en los mensajes de
 * WhatsApp, en metadatos ni en datos estructurados, aunque el producto tenga
 * `price` definido. Para publicar precios: cargue `price` en
 * src/products/products.ts y cambie este valor a `true`.
 */
export const features = {
  prices: false,
} as const;
