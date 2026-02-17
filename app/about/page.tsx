import Image from "next/image";

import { Navbar } from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";

import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { CardInner } from "@/components/ui/Card";

function SquarePortrait({ name, src }: { name: string; src: string }) {
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-khgreen/12 bg-cream">
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 360px"
        />
      </div>
      <p className="text-[14px] text-khgreen/75">{name}</p>
    </div>
  );
}

function ArticleSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="scroll-mt-24">
      <h2 className="text-[22px] sm:text-[24px] leading-tight text-khgreen">
        {title}
      </h2>
      <p className="mt-3 text-[16px] sm:text-[17px] leading-[1.8] text-khgreen/85">
        {body}
      </p>
    </section>
  );
}

function TeamCard({ className }: { className?: string }) {
  return (
    <CardInner
      tone="accent"
      className={[
        "bg-transparent border border-khgreen/10 p-6 sm:p-8",
        className ?? "",
      ].join(" ")}
    >
      <p className="text-[12px] tracking-[0.22em] text-khgreen/60">THE TEAM</p>
      <h3 className="mt-3 text-[20px] text-khgreen">Meet the founders</h3>
      <p className="mt-3 text-[15px] leading-6 text-khgreen/80">
        Meet the K and H behind KH Elevate. With a combined experience of over
        15 years in digital marketing, Kenny and Hadi have honed their skills
        across various industries, delivering exceptional results for clients
        worldwide. Their passion for creativity and data-driven strategies is
        the driving force behind KH Elevate&apos;s success.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <SquarePortrait name="Kenny" src="/ceo-1.png" />
        <SquarePortrait name="Hadi" src="/ceo-2.png" />
      </div>
    </CardInner>
  );
}

export default function AboutPage() {
  return (
    <main className="bg-cream text-khgreen">
      <Navbar />

      <Section className="pt-14 pb-16" contentSize="wide">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* ARTICLE */}
          <article className="lg:col-span-7">
            <header className="max-w-[65ch]">
              <p className="text-[12px] tracking-[0.22em] text-khgreen/60">
                ABOUT
              </p>

              <h1 className="mt-3 text-[40px] leading-[1.1] sm:text-[52px] text-khgreen">
                Why choose KH Elevate
              </h1>

              <p className="mt-5 text-[17px] sm:text-[18px] leading-[1.8] text-khgreen/80">
                We provide more than just marketing services. We offer a better
                understanding of your brand&apos;s potential.
              </p>

              <div className="mt-7">
                <Button
                  href="/#contact"
                  variant="primary"
                  className="h-12 px-7 text-[15px] shadow-[0_14px_35px_rgba(52,71,48,0.25)]"
                >
                  Get in touch
                </Button>
              </div>

              {/* Mobile: team card sits directly under CTA */}
              <div className="mt-10 lg:hidden">
                <TeamCard />
              </div>
            </header>

            <div className="mt-12 space-y-10 max-w-[70ch]">
              <ArticleSection
                title="Passion Meets Expertise"
                body="Founded by two lifelong friends with a shared vision, we bring a unique blend of creativity, strategy, and innovation. Our partnership fuels fresh ideas and bold campaigns designed to help businesses thrive in competitive markets."
              />

              <div className="h-px bg-khgreen/10" />

              <ArticleSection
                title="Comprehensive Marketing Solutions"
                body="From content creation and social media management to high-performing ad campaigns, email marketing, and web design. We provide a full spectrum of personalised services. Our clients gain one streamlined partner for consistent, high-quality marketing."
              />

              <div className="h-px bg-khgreen/10" />

              <ArticleSection
                title="Results You Can Measure"
                body="Every campaign we launch is guided by data. With in-depth social media and email analytics, we track, refine and maximise ROI, ensuring your business growth is not just creative, but quantifiable."
              />
            </div>
          </article>

          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-8">
              <TeamCard className="hidden lg:block" />
            </div>
          </aside>
        </div>
      </Section>

      <Footer />
    </main>
  );
}
