import Link from "next/link";
import { NAV_LINKS } from "@/config/navigation";
import { site } from "@/config/site";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { CtaZone } from "./CtaZone";

/**
 * Pie: cierra la página como empezó, con el mástil AROMATIC.
 * Las redes sociales solo aparecen cuando tienen URL en src/config/site.ts.
 */
export function Footer() {
  const socials = site.social.filter((s) => s.url);
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer pt-band">
      <div className="frame">
        <div className="footer-grid">
          <p className="display max-w-[22ch] text-title">{site.tagline}</p>
          <CtaZone>
            <nav aria-label="Pie de página">
              <ul className="footer-links">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="ink-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a href={whatsappLink(GENERAL_MESSAGE)} target="_blank" rel="noopener noreferrer" className="ink-link">
                    WhatsApp
                  </a>
                </li>
              </ul>
            </nav>
          </CtaZone>
          {socials.length > 0 ? (
            <ul className="footer-links" aria-label="Redes sociales">
              {socials.map((social) => (
                <li key={social.id}>
                  <a href={social.url} target="_blank" rel="noopener noreferrer" className="ink-link">
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <p className="footer-mark wordmark text-charcoal" aria-hidden="true">
          {site.name}
        </p>
        <div className="double-rule text-charcoal" aria-hidden="true" />
        <p className="field-label flex flex-wrap justify-between gap-x-6 gap-y-2 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-muted">
          <span>
            © {year} {site.name}
          </span>
          <span>
            {site.city}, {site.country}
          </span>
        </p>
      </div>
    </footer>
  );
}
