import { Container } from "@/components/ui/Container";
import { CardInner } from "@/components/ui/Card";

const testimonials = [
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
];

export function Testimonials() {
  return (
    <section className="w-full">
      <Container className="py-16">
        <div className="mx-auto w-full max-w-[1440px] rounded-[6px] bg-khgreen text-cream">
          <div className="flex flex-col items-center px-6 py-10 md:px-[66px] md:py-[54px]">
            <div className="w-full px-[2px] py-[25px]">
              <div className="text-xs font-semibold tracking-[0.22em] opacity-80 uppercase">
                Amount raised for charities we support
              </div>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                See What Our Customers Have To Say
              </h2>
            </div>

            <div className="w-full">
              <div className="grid gap-4 sm:grid-cols-3 lg:gap-[30px]">
                {testimonials.map((t) => (
                  <CardInner key={t.name} className="p-6">
                    <div className="text-sm leading-relaxed opacity-90">
                      {t.quote}
                    </div>
                    <div className="mt-5 text-sm font-bold">{t.name}</div>
                    <div className="text-xs opacity-70">{t.role}</div>
                  </CardInner>
                ))}
              </div>
            </div>

            <div className="mt-[30px] w-full rounded-[16px] bg-accent">
              <div className="flex flex-col gap-4 p-[32px] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[22px] font-medium text-khgreen leading-[33.6px]">
                    Join our awesome community
                  </div>
                  <div className="mt-1 text-[15px] text-khgreen leading-[24px]">
                    Share work, seek support, vote on components, stay updated
                    and network with other Lumers.
                  </div>
                </div>

                <button className="shrink-0 rounded-[8px] bg-khgreen px-[27px] py-[14px] text-[15px] font-medium text-accent">
                  Join our Slack
                </button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
