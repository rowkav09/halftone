"use client";

import { useEffect, useState } from "react";
import { generateLogoArt, LOGO_ROTATION_MS, LOGO_STYLES } from "@/lib/logo";

export function HalftoneLogo() {
  const [styleIndex, setStyleIndex] = useState(0);
  const style = LOGO_STYLES[styleIndex] ?? LOGO_STYLES[0];

  useEffect(() => {
    const timer = window.setInterval(() => setStyleIndex((current) => (current + 1) % LOGO_STYLES.length), LOGO_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, []);

  return style ? <pre className="h-[5.5rem] overflow-hidden py-1 font-mono text-[6px] leading-[0.82] text-emerald-200 sm:text-[8px]">{generateLogoArt(style).join("\n")}</pre> : null;
}
