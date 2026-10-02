import type { Metadata, Viewport } from "next";
import "./globals.css";
import { archivo, ibarra } from "./fonts";
import { SITE_URL, site } from "@/config/site";
import { Providers } from "@/components/Providers";
import { RevealObserver } from "@/components/RevealObserver";

const title = `${site.name} · El cuidado que se siente. La fragancia que permanece.`;

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: { default: title, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "./" },
  openGraph: {
    title,
    description: site.description,
    siteName: site.name,
    locale: "es_HN",
    type: "website",
    url: "./",
    images: [{ url: "og.png", width: 1200, height: 630, alt: `${site.name}: ${site.tagline}` }],
  },
  twitter: { card: "summary_large_image", title, description: site.description, images: ["og.png"] },
  icons: { icon: [{ url: "favicon.svg", type: "image/svg+xml" }] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${ibarra.variable} ${archivo.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        {/* Marca que hay JavaScript antes de pintar: habilita los revelados sin ocultar contenido si JS falla. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.setAttribute('data-js','')" }} />
        <a
          href="#contenido"
          className="btn btn-ink fixed left-4 top-4 z-(--z-skip) -translate-y-24 focus:translate-y-0"
        >
          Saltar al contenido
        </a>
        <Providers>
          {children}
          <RevealObserver />
        </Providers>
      </body>
    </html>
  );
}
