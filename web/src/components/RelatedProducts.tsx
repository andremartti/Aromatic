"use client";

import { PRODUCTS } from "@/products/products";
import { ProductCard } from "./ProductCard";
import { Reveal } from "./motion";
import { useProductModal } from "./ProductModalProvider";

export function RelatedProducts({ currentId }: { currentId: string }) {
  const { openProduct } = useProductModal();
  const others = PRODUCTS.filter((p) => p.id !== currentId);
  if (others.length === 0) return null;
  return (
    <section className="container-x mt-32 md:mt-44" aria-labelledby="relacionados-title">
      <p className="eyebrow mb-5">También de AROMATIC</p>
      <h2 id="relacionados-title" className="display mb-14 text-4xl md:text-5xl">
        Completa tu rutina
      </h2>
      <ul className="grid gap-16 md:grid-cols-2 md:gap-10 lg:max-w-4xl">
        {others.map((p, i) => (
          <Reveal as="li" key={p.id} delay={i * 0.1}>
            <ProductCard product={p} onOpen={(prod) => openProduct(prod.id)} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
