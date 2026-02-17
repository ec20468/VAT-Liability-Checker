"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Montagu_Slab } from "next/font/google";
import { Container } from "@/components/ui/Container";

const montagu = Montagu_Slab({ subsets: ["latin"], weight: ["600"] });

type NavLink = { label: string; href: string };

export function Navbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const links: NavLink[] = useMemo(
    () => [
      { label: "Home", href: "/#hero" },
      { label: "About", href: "/about" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
      { label: "Contact", href: "/#contact" },
    ],
    [],
  );

  // Close the menu if the user goes from mobile -> desktop.
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setOpen(false); // md breakpoint
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Prevent background scroll when menu is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function scrollToHash(hash: string) {
    const id = hash.replace("#", "");
    if (!id) return;

    const el = document.getElementById(id);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // If we navigated to "/" with a hash (e.g. from /about), scroll after the page is in place.
  useEffect(() => {
    if (pathname !== "/") return;

    const hash = window.location.hash;
    if (!hash) return;

    // rAF helps when sections render slightly after navigation.
    requestAnimationFrame(() => scrollToHash(hash));
  }, [pathname]);

  function handleNavClick(href: string) {
    setOpen(false);

    // Only custom-handle on-page hash links
    if (!href.startsWith("/#")) {
      router.push(href);
      return;
    }

    const hash = href.slice(1); // "#hero", "#features", etc.

    // If we're already on the home page, do a smooth scroll.
    if (pathname === "/") {
      // Keep URL updated without a hard jump
      window.history.pushState(null, "", hash);
      scrollToHash(hash);
      return;
    }

    // From /about (or any other page), go to home WITH the hash.
    router.push(`/${hash}`);
  }

  return (
    <header className="w-full bg-cream text-khgreen">
      <Container
        size="wide"
        className="px-5 sm:px-8 lg:px-[67px] py-6 sm:py-8 lg:py-[48px]"
      >
        <div className="flex items-start justify-between gap-6">
          <button
            type="button"
            className={`${montagu.className} h-[60px] flex items-center text-[22px] sm:text-[26px] lg:text-[30px] tracking-[2.7px] uppercase leading-none whitespace-nowrap hover:opacity-80`}
            onClick={() => handleNavClick("/#hero")}
            aria-label="Go to home"
          >
            KH Elevate
          </button>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center justify-center h-[60px] gap-5 lg:gap-[46px] text-[16px] lg:text-[20px]">
              {links.map((l) => (
                <li key={l.href}>
                  {/* Use a button so we can reliably handle smooth scrolling */}
                  <button
                    type="button"
                    className="hover:opacity-80"
                    onClick={() => handleNavClick(l.href)}
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile button */}
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            className="md:hidden h-[60px] w-[60px] grid place-items-center rounded-[10px] bg-cream"
            onClick={() => setOpen((v) => !v)}
          >
            <div className="flex flex-col gap-[6px]">
              <span
                className={`block h-[2px] w-[22px] bg-khgreen transition-transform duration-200 ${
                  open ? "translate-y-[8px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-[2px] w-[22px] bg-khgreen transition-opacity duration-200 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`block h-[2px] w-[22px] bg-khgreen transition-transform duration-200 ${
                  open ? "-translate-y-[8px] -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile panel */}
        <div
          className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ${
            open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <nav aria-label="Mobile Primary" className="pt-4">
            <ul className="flex flex-col items-center divide-y divide-khgreen/10 w-full">
              {links.map((l) => (
                <li key={l.href} className="w-full text-center">
                  <button
                    type="button"
                    onClick={() => handleNavClick(l.href)}
                    className="block w-full py-3 text-[16px] hover:opacity-80"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </header>
  );
}
