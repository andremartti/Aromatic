import Link from "next/link";

/**
 * "Más que limpieza.": índice editorial de los tres conceptos de la marca.
 * Cada concepto se sostiene solo con lo que dice el catálogo y enlaza a los
 * productos que lo cumplen.
 */
const CONCEPTS = [
  {
    number: "01",
    word: "Limpieza",
    text: "Detergente líquido para lavadora, apto para todo tipo de ropa y enriquecido con jabón natural. Jabón líquido formulado para la limpieza de manos.",
    links: [
      { href: "/productos/detergente-liquido/", label: "Detergente líquido" },
      { href: "/productos/jabon-liquido/", label: "Jabón líquido" },
    ],
  },
  {
    number: "02",
    word: "Suavidad",
    text: "Sensación de suavidad y frescura en la ropa, y un planchado más fácil. Para las manos, un jabón que ayuda a suavizar y humectar la piel.",
    links: [
      { href: "/productos/suavizante/", label: "Suavizante" },
      { href: "/productos/jabon-liquido/", label: "Jabón líquido" },
    ],
  },
  {
    number: "03",
    word: "Fragancia",
    text: "Un perfume agradable y duradero en el suavizante y el detergente, y seis aromas para elegir en el jabón líquido.",
    links: [{ href: "/#aromas", label: "Encuentra tu aroma" }],
  },
] as const;

export function ExperienceSection() {
  return (
    <section id="experiencia" className="py-section" aria-labelledby="experiencia-title">
      <div className="frame">
        <div className="max-w-[46rem]">
          <h2 id="experiencia-title" className="display reveal-ink text-heading">
            Más que limpieza.
          </h2>
          <p className="mt-6 max-w-[40ch] text-lede text-muted">
            AROMATIC combina limpieza, suavidad y fragancias agradables para convertir las tareas cotidianas en una
            experiencia diferente.
          </p>
        </div>

        <ol className="mt-band">
          {CONCEPTS.map((concept) => (
            <li key={concept.number} className="concept-row reveal">
              <span className="field-label tabular text-muted">{concept.number}</span>
              <h3 className="concept-word display">{concept.word}</h3>
              <div className="concept-copy">
                <p className="max-w-[44ch] text-body text-muted">{concept.text}</p>
                <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-1">
                  {concept.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="ink-link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
