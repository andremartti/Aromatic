import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource-variable/manrope";
import "./globals.css";
import { site } from "@/config/site";
import { Providers } from "@/components/Providers";
import { asset } from "@/lib/asset";

export const metadata: Metadata = {
  title: { default: `${site.name} — El cuidado que se siente`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    title: `${site.name} — El cuidado que se siente. La fragancia que permanece.`,
    description: site.description,
    siteName: site.name,
    locale: "es_HN",
    type: "website",
  },
  icons: { icon: asset("/favicon.svg") },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <a
          href="#contenido"
          className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-full bg-charcoal px-5 py-3 text-sm text-ivory transition-transform focus:translate-y-0"
        >
          Saltar al contenido
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
