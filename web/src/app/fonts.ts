import localFont from "next/font/local";

/**
 * Tipografías autoalojadas (sin peticiones a terceros), con precarga y
 * métricas de respaldo ajustadas por Next para evitar saltos de layout.
 *
 * - Ibarra Real Nova: titulares y nombres de producto. Revival de los tipos
 *   del impresor español Joaquín Ibarra: herencia de imprenta en castellano.
 * - Archivo (variable, ejes de peso y ancho): texto, y en ancho expandido para
 *   el wordmark y los nombres de campo de las etiquetas.
 */
export const ibarra = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/ibarra-real-nova/files/ibarra-real-nova-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/ibarra-real-nova/files/ibarra-real-nova-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-ibarra",
  display: "swap",
  fallback: ["Iowan Old Style", "Georgia", "serif"],
});

export const archivo = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
  variable: "--font-archivo",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
});
