import Link from "next/link";
import { site } from "@/config/site";
import { ProductGroup } from "./ProductGroup";
import { ArrowIcon } from "./icons";

/**
 * Hero: el mástil de la etiqueta AROMATIC a todo el ancho, con el panel de
 * producto cruzando su doble filete. La entrada es CSS (fuera del hilo
 * principal) y el acople del mástil al nav está ligado al scroll (CSS).
 */
export function Hero() {
  const letters = site.name.split("");
  return (
    <section className="hero relative overflow-clip pt-(--nav-h)" aria-labelledby="hero-title">
      <div className="frame hero-frame">
        <p className="masthead wordmark text-charcoal">
          <span className="sr-only">{site.name}</span>
          {letters.map((letter, i) => (
            <span
              key={`${letter}-${i}`}
              aria-hidden="true"
              className="ink-in inline-block"
              style={{ "--delay": `${60 + i * 32}ms` } as React.CSSProperties}
            >
              {letter}
            </span>
          ))}
        </p>
        <div className="double-rule rule-in text-charcoal" style={{ "--delay": "200ms" } as React.CSSProperties} aria-hidden="true" />

        <div className="hero-grid">
          <div className="hero-copy">
            <h1 id="hero-title" className="hero-title display">
              {site.headline.map((line, i) => (
                <span
                  key={line}
                  className="ink-in block lg:whitespace-nowrap"
                  style={{ "--delay": `${320 + i * 80}ms` } as React.CSSProperties}
                >
                  {line}
                </span>
              ))}
            </h1>
            <p className="rise-in mt-5 max-w-[34ch] text-lede text-muted lg:mt-7" style={{ "--delay": "520ms" } as React.CSSProperties}>
              {site.description}
            </p>
            <div
              className="rise-in mt-7 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-8 lg:mt-10"
              style={{ "--delay": "580ms" } as React.CSSProperties}
            >
              <Link href="/#productos" className="btn btn-ink w-full sm:w-auto">
                Descubrir productos
                <ArrowIcon className="btn-arrow size-4" />
              </Link>
              <Link href="/#marca" className="ink-link">
                Conocer AROMATIC
              </Link>
            </div>
          </div>

          <div className="hero-plate">
            <div className="label-stock rise-in hero-plate-panel" style={{ "--delay": "160ms" } as React.CSSProperties}>
              <div className="hero-plate-light" aria-hidden="true" />
              <ProductGroup animate className="hero-plate-group" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
