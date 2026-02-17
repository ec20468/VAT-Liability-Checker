"use client";

import { Container } from "@/components/ui/Container";
import { Button } from "../ui/Button";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Hero() {
  return (
    <section id="hero" className="w-full bg-cream">
      <Container
        size="wide"
        className="px-5 sm:px-8 lg:px-12 py-10 sm:py-12 lg:py-16 flex flex-col items-center justify-center"
      >
        <h1 className="text-center font-semibold uppercase text-khgreen leading-[1.05] text-[38px] sm:text-[54px] lg:text-[77px] max-w-[1228px]">
          qualified leads without Lifting a Finger
        </h1>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Button
            type="button"
            className="bg-accent text-[#0e172a] border border-[#2e4941] rounded-[6px] px-8 py-3"
            onClick={() => {
              window.history.pushState(null, "", "/#contact");
              scrollToId("contact");
            }}
          >
            Get started
          </Button>

          <Button
            type="button"
            className="bg-deepgreen text-accent border border-[rgba(255,255,255,0.2)] rounded-[6px] px-8 py-3"
            onClick={() => {
              window.history.pushState(null, "", "/#how-it-works");
              scrollToId("how-it-works");
            }}
          >
            How it works
          </Button>
        </div>
      </Container>
    </section>
  );
}
