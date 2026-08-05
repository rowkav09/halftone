"use client";

import { useEffect, useMemo, useState } from "react";
import { generateLogoArt, LOGO_ROTATION_MS, LOGO_STYLES } from "@/lib/logo";

const BOOT_STAGES = [400, 1000, 2000] as const;

export function HalftoneLogo() {
  const [styleIndex, setStyleIndex] = useState(0);
  const [bootStage, setBootStage] = useState(0);
  const style = LOGO_STYLES[styleIndex] ?? LOGO_STYLES[0];
  const logoArt = useMemo(() => style ? generateLogoArt(style) : [], [style]);

  useEffect(() => {
    const timers = BOOT_STAGES.map((delay, index) => window.setTimeout(() => setBootStage(index + 1), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (bootStage < BOOT_STAGES.length) return;
    const timer = window.setInterval(() => setStyleIndex((current) => (current + 1) % LOGO_STYLES.length), LOGO_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [bootStage]);

  const displayArt = useMemo(() => {
    if (bootStage === 0) return ["."];
    if (bootStage === 1) return [".", ". .", ". . .", ":::"];
    if (bootStage === 2) return logoArt.map((line, row) => Array.from(line, (glyph, column) => {
      if (glyph === " ") return " ";
      return (column + row * 3) % 3 === 0 ? glyph : ".";
    }).join(""));
    return logoArt;
  }, [bootStage, logoArt]);

  if (!style) return null;

  return <div className={`logo-boot relative h-[5.5rem] overflow-hidden ${bootStage < BOOT_STAGES.length ? "is-booting" : ""}`}>
    <pre className="relative z-10 h-full py-1 font-mono text-[6px] leading-[0.82] text-emerald-200 transition-opacity duration-200 sm:text-[8px]">{displayArt.join("\n")}</pre>
    {bootStage < BOOT_STAGES.length ? <span className="absolute bottom-1 right-1 z-10 font-mono text-[8px] uppercase tracking-[0.18em] text-emerald-300/70">initialising</span> : null}
  </div>;
}
