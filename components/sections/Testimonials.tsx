import { Section } from "@/components/ui/Section";
import { CardInner } from "@/components/ui/Card";

type Testimonial = { quote: string; name: string; role: string };

const testimonials: Testimonial[] = [
  {
    quote: "Clear process, quick wins, and better leads within weeks.",
    name: "Client A",
    role: "Founder",
  },
  {
    quote: "Tight positioning and smoother conversions. Strong support.",
    name: "Client B",
    role: "Consultant",
  },
  {
    quote: "We finally built consistency without burning out the team.",
    name: "Client C",
    role: "Ops Lead",
  },
  {
    quote: "More qualified enquiries, less chasing. Clean execution.",
    name: "Client D",
    role: "Director",
  },
  {
    quote: "Fast turnaround, strong communication, and real outcomes.",
    name: "Client E",
    role: "Owner",
  },
  {
    quote: "The funnel finally feels structured and predictable.",
    name: "Client F",
    role: "Co-founder",
  },
];

export function Testimonials() {
  const items = [...testimonials, ...testimonials];

  return (
    <section className="w-full bg-khgreen text-cream py-10 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8 lg:px-12">
        <div className="text-[14px] font-medium uppercase text-accent">
          Amount raised for Charities we support
        </div>

        <div className="mt-2 text-[30px] sm:text-[36px] lg:text-[45px] font-medium text-accent">
          See What Our Customers Have To Say
        </div>
      </div>

      <div className="relative mt-8 w-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[8vw] bg-gradient-to-r from-khgreen to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[8vw] bg-gradient-to-l from-khgreen to-transparent" />

        <div className="kh-marquee-viewport">
          <div className="kh-marquee-track flex w-max gap-[clamp(12px,2vw,20px)] py-4">
            {items.map((t, idx) => (
              <div
                key={`${t.name}-${idx}`}
                className="shrink-0 w-[clamp(240px,30vw,460px)]"
              >
                <CardInner
                  tone="accent"
                  className="p-6 min-h-[clamp(140px,18vh,180px)] flex flex-col justify-between"
                >
                  <div className="text-sm leading-relaxed text-khgreen/90">
                    {t.quote}
                  </div>

                  <div className="mt-5">
                    <div className="text-sm font-bold text-khgreen">
                      {t.name}
                    </div>
                    <div className="text-xs text-khgreen/70">{t.role}</div>
                  </div>
                </CardInner>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-[1100px] px-5 sm:px-8 lg:px-12">
        <div className="w-full rounded-[16px] bg-accent">
          <div className="flex flex-col gap-4 p-[24px] sm:flex-row sm:items-center sm:justify-between sm:p-[32px]">
            <div className="max-w-[700px]">
              <div className="text-[20px] sm:text-[22px] font-medium tracking-[-0.48px] text-khgreen">
                Join our awesome community
              </div>
              <div className="mt-1 text-[15px] leading-[24px] text-khgreen">
                Share work, seek support, vote on components, stay updated and
                network with other Lumers.
              </div>
            </div>

            <a
              href="#"
              className="shrink-0 rounded-[8px] bg-khgreen px-[27px] py-[14px] text-[15px] font-medium text-accent text-center"
            >
              Join our Slack
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
