import Link from "next/link";
import { asset } from "@/lib/asset";

/**
 * "Tu hogar también merece sentirse especial." Pieza editorial asimétrica:
 * un detalle de la fotografía oficial (mármol, pétalos y la base de los
 * envases) a gran tamaño, con el titular entrando desde un lateral.
 * La imagen escala de 1 a 1.06 con el scroll (CSS, sin JS).
 */
export function EditorialSection() {
  return (
    <section className="editorial" aria-labelledby="editorial-title">
      <div className="editorial-grid">
        <figure className="editorial-media">
          <picture>
            <source
              type="image/avif"
              srcSet={`${asset("/images/editorial/suavizante-luz-1440.avif")} 1440w, ${asset("/images/editorial/suavizante-luz-2104.avif")} 2104w`}
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
            <source
              type="image/webp"
              srcSet={`${asset("/images/editorial/suavizante-luz-1440.webp")} 1440w, ${asset("/images/editorial/suavizante-luz-2104.webp")} 2104w`}
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
            { }
            <img
              src={asset("/images/editorial/suavizante-luz-1440.webp")}
              alt="AROMATIC Suavizante de telas bajo una luz cálida de ventana."
              loading="lazy"
              decoding="async"
              width={1440}
              height={1401}
            />
          </picture>
        </figure>

        <div className="editorial-copy frame editorial-drift">
          <h2 id="editorial-title" className="serif text-display">
            <span className="reveal-side block">Tu hogar</span>
            <span className="reveal-side block [transition-delay:120ms]">también merece</span>
            <span className="reveal-side block [transition-delay:240ms]">sentirse especial.</span>
          </h2>
          <span className="hairline reveal-line mt-10 block w-full max-w-[22rem] text-gold" aria-hidden="true" />
          <p className="reveal mt-8 max-w-[34ch] text-lede text-warm-gray">
            Ropa suave, manos limpias y una fragancia que eliges tú. Pequeños detalles para todos los días.
          </p>
          <Link href="/#aromas" className="text-link reveal mt-6">
            Encuentra tu aroma
          </Link>
        </div>
      </div>
    </section>
  );
}
