import {
  type ArtOptions,
  type GeneratedArt,
  generateHalftoneFromStyledText,
  sanitizeCustomCharacters,
} from "@/lib/art";

export type CustomTextStyleId =
  | "banner"
  | "block"
  | "outline"
  | "shadow"
  | "retro"
  | "cyber"
  | "glitch"
  | "terminal"
  | "heavy"
  | "minimal";

export type CustomTextStyle = {
  id: CustomTextStyleId;
  name: string;
  fontWeight: number;
  italic: boolean;
  scaleX: number;
  skew: number;
  outline: number;
  shadowOffset?: number;
  fontFamily: "sans" | "mono";
};

export const CUSTOM_TEXT_ROTATION_MS = 1500;

export const CUSTOM_TEXT_STYLES: CustomTextStyle[] = [
  { id: "banner", name: "Banner", fontWeight: 800, italic: false, scaleX: 1.08, skew: -2, outline: 1, fontFamily: "sans" },
  { id: "block", name: "Block", fontWeight: 900, italic: false, scaleX: 1.02, skew: 0, outline: 2, fontFamily: "sans" },
  { id: "outline", name: "Outline", fontWeight: 600, italic: false, scaleX: 1.0, skew: 0, outline: 3, fontFamily: "sans" },
  { id: "shadow", name: "Shadow", fontWeight: 700, italic: false, scaleX: 1.0, skew: 0, outline: 0, shadowOffset: 4, fontFamily: "sans" },
  { id: "retro", name: "Retro", fontWeight: 700, italic: true, scaleX: 0.92, skew: -6, outline: 1, fontFamily: "mono" },
  { id: "cyber", name: "Cyber", fontWeight: 800, italic: false, scaleX: 1.06, skew: 8, outline: 2, fontFamily: "mono" },
  { id: "glitch", name: "Glitch", fontWeight: 700, italic: true, scaleX: 1.1, skew: -11, outline: 1, fontFamily: "mono" },
  { id: "terminal", name: "Terminal", fontWeight: 600, italic: false, scaleX: 0.96, skew: 0, outline: 0, fontFamily: "mono" },
  { id: "heavy", name: "Heavy", fontWeight: 900, italic: false, scaleX: 0.98, skew: 0, outline: 0, fontFamily: "sans" },
  { id: "minimal", name: "Minimal", fontWeight: 400, italic: false, scaleX: 0.94, skew: 0, outline: 0, fontFamily: "sans" },
];

const normalizeCustomText = (value: string) => {
  const trimmed = value.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : "TEXT";
};

export const CUSTOM_TEXT_RENDER_OPTIONS: ArtOptions = {
  columns: 84,
  characterSet: "custom",
  customText: "",
  invert: false,
  palette: "terminal",
  colorMode: "monochrome",
  packed: false,
};

export async function generateCustomTextArt(text: string, style: CustomTextStyle): Promise<GeneratedArt> {
  const normalized = normalizeCustomText(text);
  const sanitized = sanitizeCustomCharacters(normalized);

  return generateHalftoneFromStyledText(normalized, {
    ...CUSTOM_TEXT_RENDER_OPTIONS,
    customText: sanitized.length > 0 ? sanitized : normalized,
    characterSet: sanitized.length > 0 ? "custom" : "ascii",
  }, style);
}
