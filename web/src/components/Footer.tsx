import Link from "next/link";
import { NAV_LINKS } from "@/config/navigation";
import { site } from "@/config/site";
import { PRODUCTS } from "@/products/products";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { CtaZone } from "./CtaZone";

/**
 * Pie minimalista. Solo información real: redes, correo, teléfono y dirección
 * aparecen únicamente si están cargados en src/config/site.ts.
 */
export function Footer() {
  const socials = site.social.filter((s) => s.url);
  const { email, phoneDisplay, address } = site.contact;
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="frame">
        <div className="footer-top">
          <div>
            <p className="wordmark text-[1.25rem]">{site.name}</p>
            <p className="serif mt-6 max-w-[24ch] text-title">{site.tagline}</p>
          </div>

          <nav aria-label="Productos" className="footer-col">
            <p className="eyebrow">Productos</p>
            <ul className="mt-4 grid gap-1">
              {PRODUCTS.map((p) => (
                <li key={p.id}>
                  <Link href={`/productos/${p.slug}/`} className="footer-link">
                    {p.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <CtaZone className="footer-col">
            <nav aria-label="Sitio">
              <p className="eyebrow">AROMATIC</p>
              <ul className="mt-4 grid gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a href={whatsappLink(GENERAL_MESSAGE)} target="_blank" rel="noopener noreferrer" className="footer-link">
                    WhatsApp
                  </a>
                </li>
              </ul>
            </nav>
          </CtaZone>

          {socials.length > 0 || email || phoneDisplay || address ? (
            <div className="footer-col">
              <p className="eyebrow">Contacto</p>
              <ul className="mt-4 grid gap-1">
                {email ? (
                  <li>
                    <a href={`mailto:${email}`} className="footer-link">
                      {email}
                    </a>
                  </li>
                ) : null}
                {phoneDisplay ? <li className="footer-link">{phoneDisplay}</li> : null}
                {address ? <li className="footer-link">{address}</li> : null}
                {socials.map((s) => (
                  <li key={s.id}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="footer-link">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="footer-bottom">
          <span className="hairline reveal-line block w-full text-line" aria-hidden="true" />
          <p className="flex flex-wrap justify-between gap-x-6 gap-y-2 pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-small text-warm-gray">
            <span>
              © {year} {site.name}
            </span>
            <span>
              {site.city}, {site.country}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
