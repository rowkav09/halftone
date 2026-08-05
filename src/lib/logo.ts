import { createAsciiBanner, type AsciiBannerStyle } from "@/lib/asciiText";

export type LogoStyle = AsciiBannerStyle & { id: string };

export const LOGO_TEXT = "HALFTONE";
export const LOGO_ROTATION_MS = 1500;

const fills = ["#", "@", "%", "&", "X", "O", "*", "+", "=", "/"];

/** Independent ASCII treatments for the fixed HALFTONE brand wordmark. */
export const LOGO_STYLES: readonly LogoStyle[] = Array.from({ length: 50 }, (_, index) => ({
  id: `logo-${index + 1}`,
  fill: fills[index % fills.length] ?? "#",
  outline: Math.floor(index / 10) === 3,
  shadow: Math.floor(index / 10) === 4 ? "." : undefined,
  slant: Math.floor(index / 10) === 2,
  spacing: index % 2,
}));

export const generateLogoArt = (style: LogoStyle) => createAsciiBanner(LOGO_TEXT, style, 80);
