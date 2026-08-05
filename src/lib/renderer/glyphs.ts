import type { ToneField } from "@/lib/renderer/types";

const densityCache = new Map<string, string[]>();
const clamp = (value: number) => Math.min(1, Math.max(0, value));

const visualDensity = (glyph: string) => {
  if (glyph === " ") return 0;
  const canvas = document.createElement("canvas");
  canvas.width = 36;
  canvas.height = 44;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return glyph.codePointAt(0) ?? 0;
  context.font = "32px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff";
  context.fillText(glyph, 18, 22);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let filled = 0;
  for (let index = 3; index < pixels.length; index += 4) filled += pixels[index] ?? 0;
  return filled;
};

/**
 * Custom and generic ramps are sorted from empty to visually dense rather than
 * trusting a user to know the perceived coverage of each character.
 */
export const orderGlyphsByDensity = (characters: string) => {
  const unique = Array.from(new Set(Array.from(characters)));
  const key = unique.join("");
  const cached = densityCache.get(key);
  if (cached) return cached;
  const ordered = unique.map((glyph, index) => ({ glyph, index, density: visualDensity(glyph) }))
    .sort((first, second) => first.density - second.density || first.index - second.index)
    .map(({ glyph }) => glyph);
  const withSpace = ordered.includes(" ") ? ordered : [" ", ...ordered];
  densityCache.set(key, withSpace);
  return withSpace;
};

export const glyphForTone = (tone: number, glyphs: string[]) => {
  const index = Math.round(Math.pow(clamp(tone), 0.72) * Math.max(0, glyphs.length - 1));
  return glyphs[index] ?? glyphs[glyphs.length - 1] ?? " ";
};

/** Maps a Sobel gradient to the matching tangent stroke: —, /, |, or \\. */
export const edgeDirectionGlyphForTone = (tone: number, direction: number) => {
  if (tone < 0.08) return " ";
  const tangent = direction + Math.PI / 2;
  const index = ((Math.round(tangent / (Math.PI / 4)) % 4) + 4) % 4;
  return ["-", "/", "|", "\\"][index] ?? "-";
};

const glyphHash = (column: number, row: number) => Math.abs((column * 17 + row * 31 + column * row * 7) % 997);

export const textureGlyphForTone = (tone: number, set: "matrix" | "symbols" | "binary", column: number, row: number) => {
  if (set === "binary") return tone >= 0.5 ? "1" : "0";
  if (tone < 0.08) return " ";
  if (set === "matrix") {
    const glyphs = ["ｱ", "ｲ", "ｳ", "ｴ", "ｵ", "0", "1", "2", "3"];
    return glyphs[glyphHash(column, row) % glyphs.length] ?? " ";
  }
  const light = [".", "`", "'", ",", "-"];
  const middle = [":", ";", "!", "<", ">", "/", "\\", "|"];
  const heavy = ["[", "]", "{", "}", "(", ")"];
  const glyphs = tone < 0.34 ? light : tone < 0.7 ? middle : heavy;
  return glyphs[glyphHash(column, row) % glyphs.length] ?? " ";
};

const BRAILLE_DOTS: Array<[number, number, number]> = [
  [0, 0, 0x01], [0, 1, 0x02], [0, 2, 0x04], [1, 0, 0x08],
  [1, 1, 0x10], [1, 2, 0x20], [0, 3, 0x40], [1, 3, 0x80],
];

/** Converts a 2 × 4 tone sample into one genuine Unicode Braille cell. */
export const brailleGlyphAt = (field: ToneField, cellX: number, cellY: number) => {
  let mask = 0;
  for (const [dotX, dotY, bit] of BRAILLE_DOTS) {
    const tone = field.values[(cellY * 4 + dotY) * field.width + cellX * 2 + dotX] ?? 0;
    if (tone >= 0.5) mask |= bit;
  }
  return String.fromCodePoint(0x2800 + mask);
};
