import { preload } from "react-dom";
import { Navbar } from "@/components/Navbar";
import { ProductUniverse } from "@/components/ProductUniverse";
import { ExperienceSection } from "@/components/ExperienceSection";
import { FragranceSection } from "@/components/FragranceSection";
import { EditorialSection } from "@/components/EditorialSection";
import { OrderSlip } from "@/components/OrderSlip";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd } from "@/lib/structured-data";
import { SCENE } from "@/config/scene";
import { asset } from "@/lib/asset";

export default function Home() {
  // La escena es la imagen principal (LCP): se precarga con alta prioridad.
  preload(asset(SCENE.blur.webp), { as: "image", type: "image/webp", fetchPriority: "high" });
  preload(asset(SCENE.sharp.avif[0].src), {
    as: "image",
    type: "image/avif",
    fetchPriority: "high",
    imageSrcSet: SCENE.sharp.avif.map((s) => `${asset(s.src)} ${s.w}w`).join(", "),
    imageSizes: "(min-width: 1024px) 1100px, 760px",
  });

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <Navbar intro />
      <main id="contenido">
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
