import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ExperienceSection } from "@/components/ExperienceSection";
import { ProductShowcase } from "@/components/ProductShowcase";
import { FragranceSection } from "@/components/FragranceSection";
import { BrandSection } from "@/components/BrandSection";
import { PremiumExperience } from "@/components/PremiumExperience";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="contenido">
        <Hero />
        <ExperienceSection />
        <ProductShowcase />
        <FragranceSection />
        <BrandSection />
        <PremiumExperience />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
