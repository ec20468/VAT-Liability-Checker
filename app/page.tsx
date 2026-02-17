import { Navbar } from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import Showcase from "@/components/sections/Showcase";
import Stats from "@/components/sections/Stats";
import HowItWorks from "@/components/sections/HowItWorks";
import Features from "@/components/sections/Features";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactSection } from "@/components/sections/ContactSection";
import Footer from "@/components/sections/Footer";

export default function Page() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Showcase />
      <Stats />
      <HowItWorks />
      <Features />
      <Testimonials />
      <ContactSection />
      <Footer />
    </main>
  );
}
