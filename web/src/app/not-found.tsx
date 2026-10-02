import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="contenido" className="frame flex min-h-dvh flex-col justify-center pt-(--nav-h) pb-section">
        <h1 className="serif max-w-[16ch] text-heading">Esta página no existe.</h1>
        <p className="mt-5 max-w-[40ch] text-lede text-warm-gray">
          Puede que el enlace haya cambiado. Los productos y aromas siguen en la página principal.
        </p>
        <div className="mt-9">
          <Link href="/" className="btn btn-solid">
            Volver al inicio
          </Link>
        </div>
      </main>
    </>
  );
}
