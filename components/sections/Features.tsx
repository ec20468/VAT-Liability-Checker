import { Section } from "@/components/ui/Section";
import { CardInner } from "@/components/ui/Card";

type Feature = { title: string; body: string };

const features: Feature[] = [
  {
    title: "Market Intelligence",
    body: "We analyse your category, competitors and buyer psychology to surface positioning gaps and leverage points others overlook.",
  },
  {
    title: "Narrative Architecture",
    body: "We construct a coherent brand narrative — aligning offer, messaging and visual identity so every touchpoint reinforces authority.",
  },
  {
    title: "Conversion Systems",
    body: "From landing environments to acquisition funnels, we design assets built around behavioural triggers and measurable performance.",
  },
  {
    title: "Growth Infrastructure",
    body: "We implement scalable frameworks — tracking, feedback loops and optimisation cycles — so growth is engineered, not improvised.",
  },
];

function MarketIntelligenceIcon() {
  // Radar / target
  return (
    <div className="relative size-[48px] shrink-0 rounded-full bg-accent">
      <div className="absolute inset-0 rounded-full border border-accent" />
      <div className="absolute inset-[8px] rounded-full border-2 border-khgreen/80" />
      <div className="absolute inset-[16px] rounded-full border-2 border-khgreen/70" />
      <div className="absolute left-1/2 top-1/2 size-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-khgreen" />
      <div className="absolute left-1/2 top-[8px] h-[32px] w-[2px] -translate-x-1/2 bg-khgreen/35" />
      <div className="absolute left-[8px] top-1/2 h-[2px] w-[32px] -translate-y-1/2 bg-khgreen/35" />
    </div>
  );
}

function NarrativeArchitectureIcon() {
  // Blueprint / grid
  return (
    <div className="relative size-[48px] shrink-0 rounded-full bg-accent">
      <div className="absolute inset-0 rounded-full border border-accent" />
      <div className="absolute left-[12px] top-[12px] h-[24px] w-[24px] rounded-[10px] border-2 border-khgreen/80" />
      <div className="absolute left-[20px] top-[12px] h-[24px] w-[2px] bg-khgreen/40" />
      <div className="absolute left-[28px] top-[12px] h-[24px] w-[2px] bg-khgreen/40" />
      <div className="absolute left-[12px] top-[20px] h-[2px] w-[24px] bg-khgreen/40" />
      <div className="absolute left-[12px] top-[28px] h-[2px] w-[24px] bg-khgreen/40" />
    </div>
  );
}

function ConversionSystemsIcon() {
  // Funnel
  return (
    <div className="relative size-[48px] shrink-0 rounded-full bg-accent">
      <div className="absolute inset-0 rounded-full border border-accent" />
      <div className="absolute left-1/2 top-[12px] h-[6px] w-[22px] -translate-x-1/2 rounded-full border-2 border-khgreen/80" />
      <div className="absolute left-1/2 top-[22px] h-[6px] w-[16px] -translate-x-1/2 rounded-full border-2 border-khgreen/75" />
      <div className="absolute left-1/2 top-[32px] h-[6px] w-[10px] -translate-x-1/2 rounded-full border-2 border-khgreen/70" />
      <div className="absolute left-1/2 top-[18px] h-[14px] w-[2px] -translate-x-1/2 bg-khgreen/35" />
    </div>
  );
}

function GrowthInfrastructureIcon() {
  // Network nodes
  return (
    <div className="relative size-[48px] shrink-0 rounded-full bg-accent">
      <div className="absolute inset-0 rounded-full border border-accent" />

      {/* connectors */}
      <div className="absolute left-[16px] top-[16px] h-[18px] w-[18px]">
        <div className="absolute left-[3px] top-[3px] h-[2px] w-[20px] rotate-[25deg] bg-khgreen/35" />
        <div className="absolute left-[3px] top-[3px] h-[2px] w-[20px] rotate-[-25deg] bg-khgreen/35" />
      </div>

      {/* nodes */}
      <div className="absolute left-[14px] top-[14px] size-[8px] rounded-full bg-khgreen" />
      <div className="absolute right-[14px] top-[18px] size-[8px] rounded-full bg-khgreen" />
      <div className="absolute left-1/2 bottom-[14px] size-[8px] -translate-x-1/2 rounded-full bg-khgreen" />

      {/* subtle ring */}
      <div className="absolute inset-[10px] rounded-full border-2 border-khgreen/25" />
    </div>
  );
}

function FeatureIcon({ title }: { title: Feature["title"] }) {
  switch (title) {
    case "Market Intelligence":
      return <MarketIntelligenceIcon />;
    case "Narrative Architecture":
      return <NarrativeArchitectureIcon />;
    case "Conversion Systems":
      return <ConversionSystemsIcon />;
    case "Growth Infrastructure":
      return <GrowthInfrastructureIcon />;
    default:
      return <MarketIntelligenceIcon />;
  }
}

export default function Features() {
  return (
    <section id="features">
      <Section
        className="bg-cream"
        contentSize="wide"
        innerClassName="py-10 sm:py-12 lg:py-14"
      >
        <div className="py-[15px] text-khgreen">
          <div className="text-[14px] font-medium uppercase">Key features</div>
          <div className="mt-2 max-w-[520px] text-[30px] font-medium leading-tight sm:text-[36px] lg:text-[45px]">
            Empowering Businesses To Own The Narrative
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-[20px] sm:grid-cols-2 sm:gap-[28px] lg:grid-cols-4 lg:gap-[36px]">
          {features.map((f) => (
            <CardInner
              key={f.title}
              tone="green"
              className="flex flex-col rounded-[21px] px-[22px] py-[23px]"
            >
              <div className="pb-[13px]">
                <FeatureIcon title={f.title} />
              </div>

              <div className="text-[19px] font-medium leading-[28px] text-accent">
                {f.title}
              </div>

              <div className="mt-3 text-[15px] leading-[26px] tracking-[0.4px] text-accent">
                {f.body}
              </div>
            </CardInner>
          ))}
        </div>
      </Section>
    </section>
  );
}
