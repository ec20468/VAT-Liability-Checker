"use client";
import { useEffect, useState } from "react";

export function ViewportDebug() {
  const [info, setInfo] = useState({ w: 0, h: 0, bp: "" });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const bp =
        w >= 1536
          ? "2xl"
          : w >= 1280
            ? "xl"
            : w >= 1024
              ? "lg"
              : w >= 768
                ? "md"
                : w >= 640
                  ? "sm"
                  : "xs";
      setInfo({ w, h, bp });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="fixed bottom-20 left-4 z-[9999] bg-black/80 text-white font-mono text-xs px-3 py-2 rounded-lg border border-white/20 space-y-1">
      <p>
        viewport:{" "}
        <span className="text-yellow-400">
          {info.w} × {info.h}px
        </span>
      </p>
      <p>
        breakpoint: <span className="text-green-400">{info.bp}</span>
      </p>
      <p>
        device pixel ratio:{" "}
        <span className="text-blue-400">
          {typeof window !== "undefined" ? window.devicePixelRatio : "—"}
        </span>
      </p>
    </div>
  );
}
