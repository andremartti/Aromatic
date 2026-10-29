import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ShopView } from "@/components/shop/ShopView";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Compra en línea suavizante, detergente líquido y jabón líquido AROMATIC, con envío a domicilio.",
  alternates: { canonical: "tienda/" },
};

export default function TiendaPage() {
  return (
    <>
      <Navbar />
      <main id="contenido">
        <ShopView />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
