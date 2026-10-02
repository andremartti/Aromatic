import { WHATSAPP_NUMBER, site } from "@/config/site";

/**
 * Construye un enlace de WhatsApp con el mensaje ya escrito.
 * Sin número configurado, usa wa.me sin destinatario: WhatsApp abre el
 * selector de contactos con el mensaje listo.
 */
export function whatsappLink(message: string): string {
  const text = encodeURIComponent(message);
  return WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${text}` : `https://wa.me/?text=${text}`;
}

export const GENERAL_MESSAGE = `Hola ${site.name}, me gustaría hacer un pedido.`;

export function fragranceMessage(fragranceName: string): string {
  return `Hola ${site.name}, me interesa el aroma ${fragranceName}. ¿Qué productos tienen disponibles?`;
}
