import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS, getProductBySlug } from "@/products/products";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ProductDetail } from "@/components/ProductDetail";
import { RelatedProducts } from "@/components/RelatedProducts";

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
  return { title: product.name, description: product.description };
}

export default async function ProductPage({ params }: Params) {
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();

  return (
    <>
      <Navbar />
      <main id="contenido" className="pb-24 pt-28 md:pt-36">
        <div className="container-x">
          <nav aria-label="Ruta de navegación" className="mb-10 text-xs tracking-[0.16em] text-muted uppercase">
            <ol className="flex flex-wrap items-center gap-3">
              <li>
                <Link href="/" className="hover:text-charcoal">
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/#productos" className="hover:text-charcoal">
                  Productos
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-charcoal">
                {product.name}
              </li>
            </ol>
          </nav>
          <ProductDetail product={product} context="page" />
        </div>
        <RelatedProducts currentId={product.id} />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
