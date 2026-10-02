"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { SCENE, type Shot } from "@/config/scene";
import type { Product } from "@/products/types";
import { asset } from "@/lib/asset";

const EASE_FLOW = [0.22, 1, 0.36, 1] as const;

interface SceneStageProps {
  products: Product[];
  /** Producto enfocado (nítido); el resto queda en la profundidad de campo. */
  focusId: string | null;
  /** Producto con foco parcial (hover sobre un lateral). */
  previewId?: string | null;
  /** Encuadre de cámara en px de la foto. */
  shot: Shot;
  /**
   * back: solo la foto desenfocada (fondo).
   * front: solo los productos nítidos (capa transparente) y sus botones.
   * all: ambas, una sobre otra.
   */
  layer?: "back" | "front" | "all";
  /** Muestra botones sobre los productos no enfocados. */
  selectable?: boolean;
  onSelect?: (id: string) => void;
  onPreview?: (id: string | null) => void;
  className?: string;
  /** Clases de la coreografía de entrada (solo hero). */
  backEnterClass?: string;
  frontEnterClass?: string;
  priority?: boolean;
  /** `sizes` de la imagen nítida, según el ancho real de la escena. */
  sizes?: string;
}

/**
 * Escena fotográfica con cámara y foco.
 *
 * El encuadre se calcula solo con CSS (unidades de contenedor), así que la
 * primera pintura ya está encuadrada, sin esperar a JavaScript. Al cambiar de
 * producto, Motion anima el cambio de encuadre con transformaciones (FLIP) y
 * el foco pasa de un producto a otro con un fundido entre máscaras.
 * La fotografía nunca se deforma: solo se traslada y escala de forma uniforme.
 */
export function SceneStage({
  products,
  focusId,
  previewId = null,
  shot,
  layer = "all",
  selectable = false,
  onSelect,
  onPreview,
  className = "",
  backEnterClass = "",
  frontEnterClass = "",
  priority = false,
  sizes = "(min-width: 1024px) 1100px, 760px",
}: SceneStageProps) {
  const cameraStyle = {
    "--cx": shot.cx,
    "--cy": shot.cy,
    "--z": shot.z,
  } as CSSProperties;

  const showBack = layer !== "front";
  const showFront = layer !== "back";

  return (
    <div className={`stage stage-camera ${className}`} aria-hidden={layer === "back" ? true : undefined}>
      <motion.div
        className="stage-scene"
        style={cameraStyle}
        layout
        transition={{ layout: { duration: 0.85, ease: EASE_FLOW } }}
      >
        {showBack ? (
          <div className={`absolute inset-0 ${backEnterClass}`}>
            <picture>
              <source type="image/webp" srcSet={asset(SCENE.blur.webp)} />
              {/* Capa de fondo decorativa: la descripción vive en la capa nítida */}
              { }
              <img src={asset(SCENE.blur.fallback)} alt="" decoding="async" fetchPriority={priority ? "high" : "auto"} />
            </picture>
          </div>
        ) : null}

        {showFront ? (
          <div className={`absolute inset-0 ${frontEnterClass}`}>
            {products.map((product) => {
              const state = product.id === focusId ? "active" : product.id === previewId ? "preview" : "idle";
              return (
                <div
                  key={product.id}
                  className="stage-focus"
                  data-state={state}
                  style={{
                    maskImage: `url(${asset(product.scene.mask)})`,
                    WebkitMaskImage: `url(${asset(product.scene.mask)})`,
                  }}
                >
                  <ScenePicture
                    sizes={sizes}
                    priority={priority && product.id === focusId}
                    alt={product.id === focusId ? SCENE.alt : ""}
                  />
                </div>
              );
            })}

            {selectable
              ? products
                  .filter((p) => p.id !== focusId)
                  .map((product) => {
                    const b = product.scene.box;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className="stage-hit"
                        style={{
                          left: `${(b.x / SCENE.width) * 100}%`,
                          top: `${(b.y / SCENE.height) * 100}%`,
                          width: `${(b.w / SCENE.width) * 100}%`,
                          height: `${(b.h / SCENE.height) * 100}%`,
                        }}
                        aria-label={`Ver ${product.name}`}
                        onClick={() => onSelect?.(product.id)}
                        onPointerEnter={(e) => e.pointerType === "mouse" && onPreview?.(product.id)}
                        onPointerLeave={() => onPreview?.(null)}
                        onFocus={() => onPreview?.(product.id)}
                        onBlur={() => onPreview?.(null)}
                      >
                        <span className="stage-hit-label">{product.shortName}</span>
                      </button>
                    );
                  })
              : null}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

/** Fotografía nítida (AVIF/WebP/JPEG, ampliada sin alterar contenido). */
function ScenePicture({ sizes, priority, alt }: { sizes: string; priority: boolean; alt: string }) {
  return (
    <picture>
      <source type="image/avif" srcSet={SCENE.sharp.avif.map((s) => `${asset(s.src)} ${s.w}w`).join(", ")} sizes={sizes} />
      <source type="image/webp" srcSet={SCENE.sharp.webp.map((s) => `${asset(s.src)} ${s.w}w`).join(", ")} sizes={sizes} />
      { }
      <img
        src={asset(SCENE.sharp.fallback)}
        alt={alt}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
      />
    </picture>
  );
}
