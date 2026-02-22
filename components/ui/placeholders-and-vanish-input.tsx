"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Particle = {
  x: number;
  y: number;
  r: number;
  color: string;
};

export function PlaceholdersAndVanishInput({
  placeholders,
  value,
  onValueChange,
  onSubmit,
  disabled = false,
}: {
  placeholders: string[];
  value: string;
  onValueChange: (next: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAnimation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  };

  useEffect(() => {
    startAnimation();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") startAnimation();
      else if (intervalRef.current) clearInterval(intervalRef.current);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [placeholders.length]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [animating, setAnimating] = useState(false);

  const draw = useCallback(() => {
    const input = inputRef.current;
    const canvas = canvasRef.current;
    if (!input || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const W = 1200;
    const H = 200;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    const computed = getComputedStyle(input);
    const fontSize = parseFloat(computed.getPropertyValue("font-size"));
    ctx.font = `500 ${fontSize}px ${computed.fontFamily}`;
    ctx.fillStyle = "#FFF";
    ctx.textBaseline = "middle";
    ctx.fillText(value, 0, H / 2);

    const imageData = ctx.getImageData(0, 0, W, H);
    const d = imageData.data;
    const next: Particle[] = [];
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const i = (y * W + x) * 4;
        if (d[i + 3] > 128) {
          next.push({
            x,
            y,
            r: 1,
            color: `rgba(${d[i]},${d[i + 1]},${d[i + 2]},${d[i + 3]})`,
          });
        }
      }
    }
    particlesRef.current = next;
  }, [value]);

  const animate = (startX: number) => {
    const step = (pos: number) => {
      requestAnimationFrame(() => {
        const cur = particlesRef.current;
        const next: Particle[] = [];
        for (const p of cur) {
          if (p.x < pos) {
            next.push(p);
            continue;
          }
          p.x += Math.random() > 0.5 ? 1 : -1;
          p.y += Math.random() > 0.5 ? 1 : -1;
          p.r -= 0.03;
          if (p.r > 0) next.push(p);
        }
        particlesRef.current = next;
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, 1200, 200);
          for (const p of next) {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.r, p.r);
          }
        }
        if (next.length > 0) step(pos - 12);
        else {
          onValueChange("");
          setAnimating(false);
        }
      });
    };
    step(startX);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (disabled || animating || !value) return;
    setAnimating(true);
    draw();
    const maxX = particlesRef.current.reduce(
      (prev, cur) => Math.max(prev, cur.x),
      0,
    );
    animate(maxX);
    onSubmit(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative w-full mx-auto rounded-full bg-[#2f2f2f] border border-[#3d3d3d]",
        "flex items-center transition-all duration-200",
        "focus-within:border-[#555] focus-within:shadow-[0_0_0_1px_#555]",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={{
        height: "3.5vw",
        minHeight: "52px",
        paddingLeft: "1.5vw",
        paddingRight: "0.6vw",
        gap: "1vw",
      }}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute pointer-events-none filter invert left-0 top-0 w-full h-full",
          animating ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Input + placeholder stacked */}
      <div className="relative flex-1 h-full flex items-center overflow-hidden">
        <input
          ref={inputRef}
          value={value}
          disabled={disabled || animating}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(
            "relative z-10 w-full h-full bg-transparent border-none outline-none ring-0",
            "text-white font-medium",
            animating && "text-transparent",
          )}
          style={{ fontSize: "clamp(14px, 2vw, 200px)" }}
        />

        {/* Animated placeholder */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <AnimatePresence mode="wait">
            {!value && (
              <motion.span
                key={currentPlaceholder}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[#8e8ea0] font-medium truncate"
                style={{ fontSize: "clamp(14px, 2vw, 200px)" }}
              >
                {placeholders[currentPlaceholder]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Send button */}
      <button
        disabled={disabled || !value}
        type="submit"
        className={cn(
          "flex-shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95",
          value && !disabled
            ? "bg-white text-[#1a1a1a] hover:bg-neutral-200"
            : "bg-[#444] text-[#777] cursor-default",
        )}
        style={{
          width: "2.4vw",
          height: "2.4vw",
          minWidth: "36px",
          minHeight: "36px",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            width: "1vw",
            height: "1vw",
            minWidth: "14px",
            minHeight: "14px",
          }}
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </form>
  );
}
