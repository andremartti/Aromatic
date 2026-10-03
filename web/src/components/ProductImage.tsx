import type { ProductPhoto } from "@/products/types";
import { asset } from "@/lib/asset";

const HEIGHTS = [800, 1600] as const;

interface ProductImageProps {
  photo: ProductPhoto;
  alt: string;
  /** Ancho mostrado, para que el navegador elija el archivo (atributo `sizes`). */
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Fotografía recortada de un producto (fondo transparente), en AVIF y WebP. */
export function ProductImage({ photo, alt, sizes, priority = false, className = "" }: ProductImageProps) {
  const set = (ext: string) =>
    HEIGHTS.map((h) => `${asset(`${photo.base}-${h}.${ext}`)} ${Math.round(h * photo.ratio)}w`).join(", ");
  return (
    <picture>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={asset(`${photo.base}-1600.webp`)}
        alt={alt}
        width={Math.round(1600 * photo.ratio)}
        height={1600}
        className={`product-photo ${className}`}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}
