import { Section } from "@/components/ui/Section";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center w-[180px] sm:w-[200px] lg:w-[221px]">
      <div className="font-['Montaga',serif] text-[52px] leading-[52px] sm:text-[64px] sm:leading-[64px] lg:text-[72px] lg:leading-[72px]">
        {value}
      </div>
      <div className="mt-2 text-[13px] sm:text-[14px] lg:text-[15px] tracking-[0.4px]">
        {label}
      </div>
    </div>
  );
}

export default function Stats() {
  return (
    <Section className="bg-cream" innerClassName="py-8 sm:py-10 lg:py-12">
      <div className="flex flex-col items-center justify-center gap-6 lg:flex-row lg:gap-[75px]">
        <div className="text-[18px] sm:text-[20px] lg:text-[24px] font-medium max-w-[280px] text-center lg:text-left text-khgreen">
          Making a difference where it matters most
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
          <Stat value="98%" label="Client Satisfaction" />
          <Stat value="24/7" label="Support" />
          <Stat value="28%" label="Increase in revenue" />
        </div>
      </div>
    </Section>
  );
}
