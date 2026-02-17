"use client";

import { Section } from "@/components/ui/Section";

type Item = {
  src: string;
  alt: string;
  pos?: React.CSSProperties["objectPosition"];
};

type CSSVarStyle = React.CSSProperties & {
  ["--speed"]?: string;
};

const row1: Item[] = [
  { src: "/showcase/c1.png", alt: "Poster", pos: "50% 10%" },
  { src: "/showcase/c2.png", alt: "SEO", pos: "90% 100%" },
  { src: "/showcase/c6.png", alt: "Brand identity" },
  { src: "/showcase/c8.png", alt: "Ipad", pos: "50% 80%" },
  { src: "/showcase/c3.png", alt: "Bus", pos: "50% 80%" },
];

const row2: Item[] = [
  { src: "/showcase/c3.png", alt: "Bus", pos: "50% 80%" },
  { src: "/showcase/c4.png", alt: "Paid ads" },
  { src: "/showcase/c5.png", alt: "Youtube", pos: "50% 0%" },
  { src: "/showcase/c7.png", alt: "Mobile creative" },
  { src: "/showcase/c9.png", alt: "Laptop", pos: "50% 10%" },
];

function TileSet({ items }: { items: Item[] }) {
  return (
    <div className="marquee__set">
      {items.map((item, i) => (
        <div key={`${item.src}-${i}`} className="marquee__tile">
          <img
            src={item.src}
            alt={item.alt}
            style={item.pos ? { objectPosition: item.pos } : undefined}
          />
        </div>
      ))}
    </div>
  );
}

export default function Showcase() {
  const leftRowStyle: CSSVarStyle = { "--speed": "26s" };
  const rightRowStyle: CSSVarStyle = { "--speed": "30s" };

  return (
    <Section
      className="bg-cream"
      innerClassName="py-6 sm:py-10"
      contentSize="full"
    >
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
        <div className="marquee" aria-label="Agency capability showcase">
          <div className="marquee__row marquee__row--left" style={leftRowStyle}>
            <div className="marquee__track">
              <TileSet items={row1} />
              <TileSet items={row1} />
            </div>
          </div>

          <div
            className="marquee__row marquee__row--right"
            style={rightRowStyle}
          >
            <div className="marquee__track">
              <TileSet items={row2} />
              <TileSet items={row2} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
