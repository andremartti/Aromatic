/**
 * Antepone la ruta base del sitio a un archivo de /public.
 * Necesario para imágenes y archivos estáticos cuando la web se publica en
 * una subruta (GitHub Pages: /Aromatic). Los enlaces de next/link ya lo hacen solos.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  if (/^(https?:)?\/\//.test(path)) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
