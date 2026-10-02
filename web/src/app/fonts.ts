import localFont from "next/font/local";

/**
 * Tipografías autoalojadas con precarga y métricas de respaldo (sin saltos).
 *
 * - Bodoni Moda (variable, eje óptico): serif de alto contraste, de la misma
 *   familia formal que el logotipo AROMATIC impreso en las etiquetas reales.
 *   Títulos, nombres de producto y frases editoriales.
 * - Jost (variable): sans geométrica, emparentada con el texto en versalitas
 *   de la etiqueta ("SUAVIZANTE"). Navegación, descripciones, botones y datos.
 */
export const bodoni = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-opsz-normal.woff2",
      weight: "400 900",
      style: "normal",
    },
  ],
  variable: "--font-bodoni",
  display: "swap",
  fallback: ["Didot", "Georgia", "serif"],
});

export const jost = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/jost/files/jost-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-jost",
  display: "swap",
  fallback: ["Futura", "ui-sans-serif", "system-ui", "sans-serif"],
});
