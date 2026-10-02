"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

interface ProductPhotoProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Qué mostrar si la fotografía no carga (la ilustración del envase). */
  fallback: ReactNode;
}

/** Fotografía de producto con respaldo: si el archivo falta, vuelve a la ilustración. */
export function ProductPhoto({ src, alt, sizes, priority, className, fallback }: ProductPhotoProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // multiply en el contenedor: un fondo blanco de estudio se funde con la placa tintada
    <div className={`relative mix-blend-multiply ${className ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
