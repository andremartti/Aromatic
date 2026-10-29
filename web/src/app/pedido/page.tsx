import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { OrderView } from "@/components/shop/OrderView";

export const metadata: Metadata = {
  title: "Mi pedido",
  robots: { index: false, follow: false },
  // El enlace del pedido lleva un token privado: no se envía a otros sitios.
  referrer: "no-referrer",
};

export default function PedidoPage() {
  return (
    <>
      <Navbar />
      <main id="contenido">
        <OrderView />
      </main>
      <Footer />
    </>
  );
}
