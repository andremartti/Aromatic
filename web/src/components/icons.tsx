/**
 * Iconos del sitio: Phosphor (trazo "light"/"regular" consistente).
 * Importación por icono para no cargar la librería completa.
 */
import { WhatsappLogo } from "@phosphor-icons/react/dist/ssr/WhatsappLogo";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";

interface IconProps {
  className?: string;
}

export function WhatsAppIcon({ className }: IconProps) {
  return <WhatsappLogo className={className} weight="regular" aria-hidden="true" focusable="false" />;
}

export function ArrowIcon({ className }: IconProps) {
  return <ArrowRight className={className} weight="light" aria-hidden="true" focusable="false" />;
}

export function BackIcon({ className }: IconProps) {
  return <ArrowLeft className={className} weight="light" aria-hidden="true" focusable="false" />;
}
