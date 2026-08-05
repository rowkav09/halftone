"use client";

import { useEffect, useState } from "react";
import { LOGO_ROTATION_MS, LOGO_STYLES, LOGO_TEXT } from "@/lib/logo";

export function HalftoneLogo() {
  const [styleIndex, setStyleIndex] = useState(0);
  const style = LOGO_STYLES[styleIndex] ?? LOGO_STYLES[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStyleIndex((current) => (current + 1) % LOGO_STYLES.length);
    }, LOGO_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, []);

  if (!style) {
    return null;
  }

  return (
    <div className="min-w-0 rounded-[1rem] border border-white/10 bg-black/60 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-slate-500">
        <span>Brand signal</span>
        <span>{style.label}</span>
      </div>
      <div className="overflow-hidden py-1">
        <span
          aria-label="Halftone"
          className={`block origin-left whitespace-nowrap text-xl leading-none text-emerald-100 transition-all duration-500 sm:text-3xl ${style.fontFamily === "mono" ? "font-mono" : "font-sans"} ${style.glow ? "drop-shadow-[0_0_12px_rgba(110,255,148,0.55)]" : ""} ${style.outline ? "text-transparent [-webkit-text-stroke:1px_rgb(200_255_191)]" : ""}`}
          style={{
            fontWeight: style.fontWeight,
            fontStyle: style.italic ? "italic" : "normal",
            letterSpacing: style.letterSpacing,
            transform: `scaleX(${style.scaleX}) skewX(${style.skew}deg)`,
          }}
        >
          {LOGO_TEXT}
        </span>
      </div>
    </div>
  );
}
