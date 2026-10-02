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

export const GENERAL_MESSAGE = `Hola ${site.name}, me gustaría solicitar información sobre sus productos.`;

export function infoMessage(productName: string): string {
  return `Hola ${site.name}, me gustaría recibir información sobre ${productName}.`;
}

export function fragranceMessage(fragranceName: string, productNames: string): string {
  return `Hola ${site.name}, me gustaría recibir información sobre el aroma ${fragranceName} en ${productNames}.`;
}
