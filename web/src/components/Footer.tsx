import Link from "next/link";
import { site } from "@/config/site";
import { GENERAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";

export function Footer() {
  const socials = site.social.filter((s) => s.url);
  const links = [
    { href: "/#productos", label: "Productos" },
    { href: "/#aromas", label: "Aromas" },
    { href: "/#marca", label: "Sobre AROMATIC" },
  ] satisfies { href: string; label: string }[];

  return (
    <footer className="border-t border-line bg-ivory" aria-labelledby="footer-title">
      <div className="container-x py-20 md:py-28">
        <div className="grid gap-16 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p id="footer-title" className="wordmark text-3xl text-charcoal md:text-4xl">
              AROMATIC
            </p>
            <p className="mt-6 max-w-xs font-serif text-xl leading-snug text-muted">{site.tagline}</p>
          </div>

          <nav aria-label="Pie de página">
            <p className="eyebrow mb-6">Explorar</p>
            <ul className="space-y-3">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[0.9375rem] text-ink transition-colors hover:text-bronze">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow mb-6">Contacto</p>
            <ul className="space-y-3">
              <li>
                <a
                  href={whatsappLink(GENERAL_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.9375rem] text-ink transition-colors hover:text-bronze"
                >
                  Contacto
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink(GENERAL_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.9375rem] text-ink transition-colors hover:text-bronze"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
            {socials.length > 0 && (
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3" aria-label="Redes sociales">
                {socials.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold tracking-[0.16em] text-charcoal uppercase transition-colors hover:text-bronze"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t border-line pt-8 text-xs text-muted md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} AROMATIC. Todos los derechos reservados.</p>
          <p className="tracking-[0.2em] uppercase">El cuidado que se siente</p>
        </div>
      </div>
    </footer>
  );
}

