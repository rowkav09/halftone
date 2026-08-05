import { createAsciiBanner, type AsciiBannerStyle } from "@/lib/asciiText";
import { getCharactersForSet, PALETTES, type ArtOptions, type GeneratedArt } from "@/lib/art";

export type CustomTextStyleId = "banner" | "block" | "outline" | "shadow" | "retro" | "cyber" | "glitch" | "terminal" | "heavy" | "minimal";
export type CustomTextStyle = AsciiBannerStyle & { id: CustomTextStyleId; name: string };

export const CUSTOM_TEXT_STYLES: readonly CustomTextStyle[] = [
  { id: "banner", name: "Banner", fill: "#" },
  { id: "block", name: "Block", fill: "@", spacing: 0 },
  { id: "outline", name: "Outline", fill: "#", outline: true },
  { id: "shadow", name: "Shadow", fill: "#", shadow: "." },
  { id: "retro", name: "Retro", fill: "=", slant: true },
  { id: "cyber", name: "Cyber", fill: "+", slant: true, spacing: 0 },
  { id: "glitch", name: "Glitch", fill: "%", shadow: "/" },
  { id: "terminal", name: "Terminal", fill: "@", spacing: 0 },
  { id: "heavy", name: "Heavy", fill: "&", spacing: 0 },
  { id: "minimal", name: "Minimal", fill: ".", spacing: 1 },
];

export const generateCustomTextArt = (text: string, style: CustomTextStyle, options: ArtOptions): GeneratedArt => {
  const characterSet = getCharactersForSet(options.characterSet, options.customText);
  const solid = Array.from(characterSet).at(-1) ?? style.fill;
  const background = options.invert ? "#e8edf2" : (PALETTES.find((palette) => palette.id === options.palette) ?? PALETTES[0]).background;
  const foreground = options.invert ? "#070b14" : options.colorMode === "colour" ? "#e8edf2" : (PALETTES.find((palette) => palette.id === options.palette) ?? PALETTES[0]).foreground;
  const lines = createAsciiBanner(text, { ...style, fill: solid }, options.columns);

  return {
    lines,
    colors: lines.map((line) => Array.from(line, () => foreground)),
    columns: Math.max(...lines.map((line) => line.length), 0),
    rows: lines.length,
    foreground,
    background,
  };
};
