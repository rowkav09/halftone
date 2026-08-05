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

  return style ? <pre className="overflow-hidden py-1 font-mono text-[5px] leading-[0.78] text-emerald-200 sm:text-[7px]">{generateLogoArt(style).join("\n")}</pre> : null;
}
