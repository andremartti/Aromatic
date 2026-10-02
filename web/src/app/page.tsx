import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ExperienceSection } from "@/components/ExperienceSection";
import { ProductShowcase } from "@/components/ProductShowcase";
import { FragranceSection } from "@/components/FragranceSection";
import { BrandSection } from "@/components/BrandSection";
import { EditorialSection } from "@/components/EditorialSection";
import { OrderSlip } from "@/components/OrderSlip";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd } from "@/lib/structured-data";

export default function Home() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <Navbar variant="home" />
      <main id="contenido">
        <Hero />
        <ExperienceSection />
        <ProductShowcase />
        <FragranceSection />
        <BrandSection />
        <EditorialSection />
        <OrderSlip />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
