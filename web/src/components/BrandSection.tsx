import { site } from "@/config/site";
import { PRODUCTS } from "@/products/products";
import { joinList } from "@/lib/format";

/**
 * "Una nueva forma de entender la limpieza.": Sobre AROMATIC.
 * Solo hechos respaldados por el catálogo y por la marca: qué productos son,
 * en qué presentaciones llegan y cómo se piden. Sin historia corporativa.
 */
/**
 * Presentaciones del catálogo sin repetir, en el orden del producto con más
 * presentaciones (se actualizan solas con los datos).
 */
const PRESENTATIONS = [
  ...new Set(
    [...PRODUCTS]
      .sort((a, b) => b.presentations.length - a.presentations.length)
      .flatMap((p) => p.presentations.map((pr) => pr.label)),
  ),
];

const FIELDS = [
  { label: "Hecho para", value: "La ropa, las manos y el hogar" },
  { label: "Presentaciones", value: joinList(PRESENTATIONS) },
  { label: "Pedidos", value: `Por WhatsApp, en ${site.city}` },
] as const;

export function BrandSection() {
  return (
    <section id="marca" className="py-section" aria-labelledby="marca-title">
      <div className="frame">
        <div className="brand-statement">
          <h2 id="marca-title" className="display reveal-ink text-heading">
            Una nueva forma de entender la limpieza.
          </h2>
          <div className="brand-copy">
            <p className="text-lede text-ink">
              Tres productos para la casa: suavizante, detergente líquido para lavadora y jabón líquido para manos.
              Creados para mantener hogares limpios y frescos.
            </p>
            <p className="mt-5 text-body text-muted">
              Se venden en {site.city} y se piden por WhatsApp, con el producto, el aroma y la presentación que prefieras.
            </p>
          </div>
        </div>

        <dl className="brand-band label-stock reveal mt-band">
          {FIELDS.map((field) => (
            <div key={field.label} className="brand-field">
              <dt className="field-label text-muted">{field.label}</dt>
              <dd className="display mt-3 text-[clamp(1.375rem,1.1rem+0.9vw,1.875rem)] leading-tight">{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
