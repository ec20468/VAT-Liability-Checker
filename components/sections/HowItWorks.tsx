import Image from "next/image";
import { Container } from "@/components/ui/Container";

const chips = ["Everyone", "Freelancers", "Organisations"] as const;

const bullets = [
  {
    title: "Diagnosis",
    text: "We start by understanding your current model, challenges, and goals to identify growth opportunities.",
  },
  {
    title: "Positioning",
    text: "We refine narrative, value articulaation and market fit so your business communicates via the right channels with the right message.",
  },
  {
    title: "Implementation",
    text: "Strategy is translated into assets and systems that drive growth - from meticulously crafted landing pages to conversion optimized funnels and email sequences.",
  },
  {
    title: "Performance Discipline",
    text: "We establish feedback loops and reporting to continuously iterate and improve, ensuring your marketing evolves with your business and market dynamics.",
  },
];

export default function HowItWorks() {
  return (
    <section className="w-full bg-cream" id="how-it-works">
      <div className="w-full bg-khgreen">
        <Container
          size="wide"
          className="px-5 sm:px-8 lg:px-[66px] py-10 sm:py-12 lg:py-[54px]"
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-[39px] items-start">
            {/* LEFT */}
            <div className="w-full">
              <div className="py-[25px] lg:pr-[25px]">
                <div className="text-[14px] font-medium uppercase text-accent leading-[44px]">
                  How it works
                </div>

                <div className="mt-[17px] text-accent">
                  <div className="text-[30px] sm:text-[36px] lg:text-[45px] font-medium leading-tight">
                    Solving real world business problems
                  </div>

                  <p className="mt-3 font-['Montaga',serif] text-[16px] opacity-90">
                    KH Elevate is a growth marketing agency that helps
                    businesses of all sizes achieve their growth goals through a
                    unique blend of creativity, strategy, and data-driven
                    execution. We work closely with our clients to understand
                    their business, identify growth opportunities, and implement
                    tailored marketing strategies that drive results.
                  </p>
                </div>

                {/* Mobile logo between title and chips/bullets */}
                <div className="mt-6 lg:hidden">
                  <LogoBlock />
                </div>

                {/* CHIPS (fixed centring) */}
                <div className="mt-6 flex flex-wrap gap-[14px] py-[16px]">
                  {chips.map((c) => (
                    <span
                      key={c}
                      className="inline-flex h-[27px] items-center justify-center rounded-full bg-accent px-[12px] text-[14px] leading-none text-khgreen"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                {/* BULLETS (remove outline) */}
                <div className="mt-2 w-full rounded-[21px] bg-khgreen px-[14px] py-[20px]">
                  <div className="grid grid-cols-1 gap-x-[46px] gap-y-6 sm:grid-cols-2">
                    {bullets.map((b, i) => (
                      <div key={i} className="min-w-0">
                        <div className="flex items-center gap-[10px] py-px">
                          <span className="size-[10px] rounded-full bg-accent shrink-0" />
                          <div className="text-[20px] font-bold text-accent">
                            {b.title}
                          </div>
                        </div>

                        <div className="mt-2 text-[16px] leading-[29.6px] text-accent">
                          {b.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT (desktop logo) */}
            <div className="hidden lg:block">
              <LogoBlock />
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}

function LogoBlock() {
  return (
    <div className="w-full flex items-center justify-center">
      <Image
        src="/logo.jpeg"
        alt="KH Elevate logo"
        width={530}
        height={530}
        className="w-full max-w-[520px] lg:max-w-[530px] h-auto object-contain rounded-[21px]"
        priority={false}
      />
    </div>
  );
}
