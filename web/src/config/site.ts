/**
 * Configuración general del sitio AROMATIC.
 * Todo lo que la marca necesita ajustar sin tocar componentes vive aquí.
 */

/**
 * Número de WhatsApp en formato internacional, SOLO dígitos
 * (código de país + número). Se toma de la variable de entorno
 * NEXT_PUBLIC_WHATSAPP_NUMBER (ver .env.example).
 *
 * Mientras esté vacío, los botones abren WhatsApp con el mensaje ya escrito
 * y el cliente elige el contacto.
 */
export const WHATSAPP_NUMBER: string = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

export const site = {
  name: "AROMATIC",
  tagline: "Calidad que se siente. Fragancia que permanece.",
  description:
    "Productos premium para transformar cada momento de limpieza en una experiencia de frescura, suavidad y aroma.",
  /** Formato de precios. */
  currency: { code: "HNL", locale: "es-HN" },
  /**
   * Redes sociales. Deje la URL vacía hasta tener la cuenta oficial:
   * los enlaces sin URL no se muestran.
   */
  social: [
    { id: "instagram", label: "Instagram", url: "" },
    { id: "facebook", label: "Facebook", url: "" },
    { id: "tiktok", label: "TikTok", url: "" },
  ],
} as const;
