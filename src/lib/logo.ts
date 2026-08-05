import { generateFigletArt } from "@/lib/customText";

export type LogoStyle = { id: string; font: string };

export const LOGO_TEXT = "HALFTONE";
export const LOGO_ROTATION_MS = 1500;

/**
 * Curated for the fixed header frame. Larger FIGlet fonts remain available in
 * the text generator, but would crop on narrower screens when used as a logo.
 */
const LOGO_FONTS = [
  "ANSI Regular",
  "Banner",
  "Roman",
  "Slant",
  "Standard",
  "Rectangles",
  "Small",
] as const;

export const LOGO_STYLES: readonly LogoStyle[] = LOGO_FONTS.map((font) => ({
  id: `logo-${font.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  font,
}));

export const generateLogoArt = (style: LogoStyle) => generateFigletArt(LOGO_TEXT, style.font).lines;
