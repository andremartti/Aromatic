import { PRODUCTS, photoFor } from "@/products/products";
import { ProductImage } from "../ProductImage";

interface ShopThumbProps {
  slug: string | undefined;
  name: string;
  fragranceId?: string | null;
  imageUrl?: string | null;
  sizes?: string;
  className?: string;
  alt?: string;
}

/**
 * Foto del producto para la tienda: usa la fotografía oficial recortada si el
 * producto existe en el catálogo del sitio, la imagen subida desde el panel si
 * es nuevo, o un marcador neutro (nunca se inventa una etiqueta).
 */
export function ShopThumb({ slug, name, fragranceId, imageUrl, sizes = "96px", className = "", alt = "" }: ShopThumbProps) {
  const staticProduct = PRODUCTS.find((p) => p.slug === slug);
  return (
    <span className={`shop-thumb ${className}`}>
      {staticProduct ? (
        <ProductImage photo={photoFor(staticProduct, fragranceId ?? undefined)} alt={alt} sizes={sizes} />
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={alt} loading="lazy" decoding="async" className="shop-thumb-img" />
      ) : (
        <span className="shop-thumb-empty serif" aria-hidden="true">
          {name.replace(/^AROMATIC\s+/i, "").charAt(0)}
        </span>
      )}
    </span>
  );
}
