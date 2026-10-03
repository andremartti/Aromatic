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
import { ProductImage } from "@/components/ProductImage";
import { JsonLd } from "@/components/JsonLd";
import { ArrowIcon } from "@/components/icons";

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
  const description = `${product.summary} Aroma: ${joinList(product.fragrances.map((f) => f.name))}. Presentación: ${joinList(
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
      <Navbar />
      <main id="contenido" className="pt-(--nav-h)">
        <div className="frame">
          <nav aria-label="Ruta de navegación" className="py-6">
            <ol className="flex flex-wrap items-center gap-x-3 text-small text-warm-gray">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center hover:text-charcoal">
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/#productos" className="inline-flex min-h-11 items-center hover:text-charcoal">
                  Productos
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-charcoal">
                {product.shortName}
              </li>
            </ol>
          </nav>
          <ProductDetail product={product} />
        </div>

        <section className="py-section" aria-labelledby="otros-title">
          <div className="frame">
            <h2 id="otros-title" className="serif reveal-text text-heading">
              También de AROMATIC
            </h2>
            <ul className="mt-12 grid gap-10 sm:grid-cols-2">
              {others.map((p) => (
                <li key={p.id} className="reveal">
                  <Link href={`/productos/${p.slug}/`} className="related-card group">
                    <div className="related-stage">
                      <div className="related-media">
                        <ProductImage photo={p.image} alt="" sizes="(min-width: 640px) 30vw, 70vw" />
                      </div>
                    </div>
                    <p className="eyebrow mt-6">{p.use}</p>
                    <p className="serif mt-2 flex items-center justify-between gap-4 text-title">
                      {p.shortName}
                      <ArrowIcon className="size-5 shrink-0 transition-transform duration-500 group-hover:translate-x-1" />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
