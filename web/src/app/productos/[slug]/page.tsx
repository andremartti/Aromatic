import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS, getProductBySlug } from "@/products/products";
import { productJsonLd } from "@/lib/structured-data";
import { joinList } from "@/lib/format";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ProductDetail } from "@/components/ProductDetail";
import { ProductLabel } from "@/components/ProductLabel";
import { JsonLd } from "@/components/JsonLd";

interface Params {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = getProductBySlug((await params).slug);
  if (!product) return {};
  const description = `${product.description} Aroma: ${joinList(product.fragrances.map((f) => f.name))}. Presentación: ${joinList(
    product.presentations.map((p) => p.label),
  )}.`;
  return {
    title: product.shortName,
    description,
    alternates: { canonical: `productos/${product.slug}/` },
    openGraph: { title: product.name, description, url: `productos/${product.slug}/`, type: "website" },
  };
}

export default async function ProductPage({ params }: Params) {
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();
  const others = PRODUCTS.filter((p) => p.id !== product.id);

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <Navbar variant="page" />
      <main id="contenido" className="pt-(--nav-h)">
        <div className="frame">
          <nav aria-label="Ruta de navegación" className="pt-6 pb-8 lg:pt-10 lg:pb-12">
            <ol className="field-label flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center hover:text-charcoal">
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true" className="text-rule-strong">
                /
              </li>
              <li>
                <Link href="/#productos" className="inline-flex min-h-11 items-center hover:text-charcoal">
                  Productos
                </Link>
              </li>
              <li aria-hidden="true" className="text-rule-strong">
                /
              </li>
              <li aria-current="page" className="text-charcoal">
                {product.shortName}
              </li>
            </ol>
          </nav>
          <ProductDetail product={product} />
        </div>

        {others.length > 0 ? (
          <section className="py-section" aria-labelledby="otros-title">
            <div className="frame">
              <h2 id="otros-title" className="display text-heading">
                También de AROMATIC
              </h2>
              <div className="related-grid mt-band">
                {others.map((p) => (
                  <ProductLabel key={p.id} product={p} variant="compact" />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
