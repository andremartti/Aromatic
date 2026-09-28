import Link from "next/link";

export default function NotFound() {
  return (
    <main id="contenido" className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="wordmark text-sm text-muted">AROMATIC</p>
      <h1 className="display mt-8 text-5xl md:text-6xl">Esta página no existe.</h1>
      <Link
        href="/"
        className="mt-10 inline-flex min-h-12 items-center rounded-full bg-charcoal px-8 text-xs font-semibold tracking-[0.12em] text-ivory uppercase"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
