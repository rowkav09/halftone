import { CUSTOM_TEXT_STYLES, generateFigletArt } from "@/lib/customText";

export type LogoStyle = { id: string; font: string };

export const LOGO_TEXT = "HALFTONE";
export const LOGO_ROTATION_MS = 1500;

/** Fixed-word FIGlet treatments, independent of every generator setting. */
export const LOGO_STYLES: readonly LogoStyle[] = Array.from({ length: 50 }, (_, index) => ({
  id: `logo-${index + 1}`,
  font: CUSTOM_TEXT_STYLES[index % CUSTOM_TEXT_STYLES.length]?.font ?? "Standard",
}));

export const generateLogoArt = (style: LogoStyle) => generateFigletArt(LOGO_TEXT, style.font).lines;
