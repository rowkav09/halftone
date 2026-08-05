"use client";

import { useEffect, useMemo, useState } from "react";
import { generateLogoArt, LOGO_ROTATION_MS, LOGO_STYLES } from "@/lib/logo";

const BOOT_TIMELINE = [250, 650, 1100, 1650, 2300] as const;
const INTRO_STYLE = LOGO_STYLES.find((style) => style.font === "Standard") ?? LOGO_STYLES[0];
const SIGNAL_GLYPHS = Array.from("01.:;<>/\\");

const signalCharacter = (column: number, row: number) => SIGNAL_GLYPHS[Math.abs((column * 17 + row * 31 + column * row * 7) % SIGNAL_GLYPHS.length)] ?? ".";

const createIntroFrame = (stage: number, art: string[]) => {
  if (stage === 0) return ["·"];
  if (stage === 1) return [".", ". .", ". . .", "::..::", ". . .", ". .", "."];

  return art.map((line, row) => Array.from(line, (glyph, column) => {
    if (glyph === " ") return " ";
    if (stage === 2) return signalCharacter(column, row);
    if (stage === 3 && (column + row * 3) % 3 !== 0) return signalCharacter(column, row);
    return glyph;
  }).join(""));
};

export function HalftoneLogo() {
  const [styleIndex, setStyleIndex] = useState(0);
  const [bootStage, setBootStage] = useState(0);
  const style = LOGO_STYLES[styleIndex] ?? LOGO_STYLES[0];
  const logoArt = useMemo(() => style ? generateLogoArt(style) : [], [style]);
  const introArt = useMemo(() => INTRO_STYLE ? generateLogoArt(INTRO_STYLE) : [], []);
  const isBooting = bootStage < BOOT_TIMELINE.length;

  useEffect(() => {
    const timers = BOOT_TIMELINE.map((delay, index) => window.setTimeout(() => setBootStage(index + 1), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (isBooting) return;
    const timer = window.setInterval(() => setStyleIndex((current) => (current + 1) % LOGO_STYLES.length), LOGO_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [isBooting]);

  const introFrame = useMemo(() => createIntroFrame(bootStage, introArt), [bootStage, introArt]);

  if (!style) return null;

  return <>
    {isBooting ? <div className="ascii-intro fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#020408]" aria-hidden>
      <div className="ascii-intro-signal relative w-full max-w-5xl px-5 text-center">
        <pre className="relative z-10 overflow-hidden font-mono text-[clamp(6px,1.5vw,14px)] leading-[0.9] text-emerald-100">{introFrame.join("\n")}</pre>
        <p className="relative z-10 mt-8 font-mono text-[10px] uppercase tracking-[0.42em] text-emerald-300/80">{bootStage < 2 ? "finding signal" : bootStage < 4 ? "resolving character field" : "halftone online"}</p>
      </div>
    </div> : null}
    <div className={`relative h-[5.5rem] overflow-hidden transition-opacity duration-300 ${isBooting ? "opacity-0" : "opacity-100"}`}>
      <pre className="h-full py-1 font-mono text-[6px] leading-[0.82] text-emerald-200 sm:text-[8px]">{logoArt.join("\n")}</pre>
    </div>
  </>;
}
