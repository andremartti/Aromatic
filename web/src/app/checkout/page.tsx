import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { CheckoutView } from "@/components/shop/CheckoutView";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <main id="contenido">
        <CheckoutView />
      </main>
    </>
  );
}
