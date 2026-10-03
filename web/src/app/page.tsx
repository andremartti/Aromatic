import { Navbar } from "@/components/Navbar";
import { HomeIntro } from "@/components/HomeIntro";
import { ProductUniverse } from "@/components/ProductUniverse";
import { ExperienceSection } from "@/components/ExperienceSection";
import { FragranceSection } from "@/components/FragranceSection";
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
      <Navbar intro />
      <main id="contenido">
        <HomeIntro />
        <ProductUniverse />
        <ExperienceSection />
        <FragranceSection />
        <EditorialSection />
        <OrderSlip />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
