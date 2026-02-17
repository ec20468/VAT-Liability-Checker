import { Container } from "@/components/ui/Container";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-cream">
      <Container size="wide" className="px-5 sm:px-8 lg:px-12">
        <div className="border-t border-[rgba(25,25,25,0.1)] py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <div className="text-[#0b103a] tracking-[2.52px] text-[28px]">
                KH Elevate
              </div>
              <p className="mt-6 text-black text-[14px] leading-[24px] max-w-[534px]">
                KH Elevate is a growth marketing agency that helps businesses
                find and own their narrative. We combine creativity, strategy,
                and data-driven execution to drive growth and help our clients
                achieve their goals.
              </p>

              <div className="mt-8 flex flex-wrap gap-6 text-black text-[14px]">
                <a
                  href="https://www.tiktok.com/@kh.elevate?is_from_webapp=1&sender_device=pc"
                  className="hover:opacity-70"
                >
                  TikTok
                </a>
                <a
                  href="https://www.instagram.com/kh.elevate"
                  className="hover:opacity-70"
                >
                  Instagram
                </a>
              </div>
            </div>

            <div>
              <div className="text-black font-bold text-[18px]">Pages</div>
              <div className="mt-6 space-y-4 text-black text-[14px] leading-[24px]">
                <div>
                  <Link href="/#hero">Home</Link>
                </div>
                <div>
                  <Link href="/about">About</Link>
                </div>
              </div>
            </div>

            <div>
              <div className="text-black font-bold text-[18px]">Navigation</div>
              <div className="mt-6 space-y-4 text-black text-[14px] leading-[24px]">
                <div>
                  <Link href="/about">About</Link>
                </div>
                <div>
                  <Link href="/#how-it-works">How It Works</Link>
                </div>
                <div>
                  <Link href="/#features">Features</Link>
                </div>
                <div>
                  <Link href="/#contact">Contact</Link>
                </div>
              </div>
            </div>

            <div>
              <div className="text-black font-bold text-[18px]">Contact</div>
              <div className="mt-6 space-y-3 text-black text-[14px] leading-[24px]">
                <div>(+44) 555 0120</div>
                <div>khelevate@gmail.com</div>
                <div>London, United Kingdom</div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
