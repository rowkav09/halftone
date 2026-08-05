import { applyDither } from "@/lib/renderer/dithering";
import { brailleGlyphAt, glyphForTone, orderGlyphsByDensity, textureGlyphForTone } from "@/lib/renderer/glyphs";
import { adjustImageData, combineToneAndEdges, sobelEdges } from "@/lib/renderer/processing";
import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  DITHER_ALGORITHMS,
  RENDER_MODES,
  type DitherAlgorithm,
  type ImageAdjustments,
  type RenderMode,
  type Rgb,
  type ToneField,
} from "@/lib/renderer/types";

export const CHARACTER_SETS = {
  ascii: " .:-=+*#%@",
  braille: "⣀⣄⣤⣦⣶⣷⣿",
  blocks: " ░▒▓█",
  binary: "01",
  matrix: " ｱｲｳｴｵ0123",
  symbols: " .`'-,^:;!<>/\\|[]{}()",
  unicode: " ▁▂▃▄▅▆▇█",
  unicodeFine: " .`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
} as const;

export type CharacterSetId = keyof typeof CHARACTER_SETS | "custom";
export type ColorMode = "colour" | "monochrome";
export const COLOR_COUNTS = [0, 2, 4, 8, 16] as const;
export type ColorCount = (typeof COLOR_COUNTS)[number];

export const PALETTES = [
  { id: "bw", name: "Black & White", foreground: "#e8edf2", background: "#070b14", accent: "#a9b4c2" },
  { id: "terminal", name: "Green Terminal", foreground: "#c8ffbf", background: "#041108", accent: "#76ff94" },
  { id: "amber", name: "Amber CRT", foreground: "#ffd7a0", background: "#100a02", accent: "#ffb84d" },
  { id: "blue", name: "Blue", foreground: "#d9ebff", background: "#06111d", accent: "#5ab1ff" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export type ArtOptions = {
  columns: number;
  characterSet: CharacterSetId;
  customText: string;
  invert: boolean;
  palette: PaletteId;
  colorMode: ColorMode;
  colorCount: ColorCount;
  ditherAlgorithm?: DitherAlgorithm;
  renderMode?: RenderMode;
  adjustments?: Partial<ImageAdjustments>;
};

export type GeneratedArt = {
  lines: string[];
  colors: string[][];
  columns: number;
  rows: number;
  foreground: string;
  background: string;
};

export { DEFAULT_IMAGE_ADJUSTMENTS, DITHER_ALGORITHMS, RENDER_MODES };
export type { DitherAlgorithm, ImageAdjustments, RenderMode };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const sanitizeCustomCharacters = (value: string) => Array.from(new Set(Array.from(value.replace(/\s+/g, "")))).join("");

export const getCharactersForSet = (characterSet: CharacterSetId, customText: string) => {
  if (characterSet === "custom") {
    const sanitized = sanitizeCustomCharacters(customText);
    return sanitized.length > 0 ? sanitized : CHARACTER_SETS.ascii;
  }
  return CHARACTER_SETS[characterSet];
};

const getPalette = (palette: PaletteId) => PALETTES.find((option) => option.id === palette) ?? PALETTES[0];

const toHexColor = (red: number, green: number, blue: number) => {
  const componentToHex = (component: number) => Math.round(clamp(component, 0, 255)).toString(16).padStart(2, "0");
  return `#${componentToHex(red)}${componentToHex(green)}${componentToHex(blue)}`;
};

// Dark source pixels still need enough light to be legible on the black canvas.
const toReadableColor = (red: number, green: number, blue: number, tone: number) => {
  const lift = 0.32 + 0.5 * clamp(tone, 0, 1);
  return toHexColor(red + (235 - red) * lift, green + (242 - green) * lift, blue + (255 - blue) * lift);
};

const squaredDistance = (first: Rgb, second: Rgb) => {
  const red = first[0] - second[0];
  const green = first[1] - second[1];
  const blue = first[2] - second[2];
  return red * red + green * green + blue * blue;
};

const getImagePalette = (sampled: Uint8ClampedArray, colorCount: ColorCount): Rgb[] | null => {
  if (colorCount === 0) return null;
  const samples: Rgb[] = [];
  const cellCount = sampled.length / 4;
  const sampleStride = Math.max(1, Math.floor(cellCount / 2400));
  for (let cell = 0; cell < cellCount; cell += sampleStride) {
    const index = cell * 4;
    samples.push([sampled[index] ?? 0, sampled[index + 1] ?? 0, sampled[index + 2] ?? 0]);
  }
  if (!samples.length) return null;

  const centers: Rgb[] = [samples[0] ?? [0, 0, 0]];
  while (centers.length < colorCount) {
    let candidate = samples[0] ?? [0, 0, 0];
    let greatestDistance = -1;
    for (const sample of samples) {
      const nearest = Math.min(...centers.map((center) => squaredDistance(sample, center)));
      if (nearest > greatestDistance) { greatestDistance = nearest; candidate = sample; }
    }
    centers.push(candidate);
  }

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const totals = centers.map(() => [0, 0, 0, 0]);
    for (const sample of samples) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      centers.forEach((center, index) => {
        const distance = squaredDistance(sample, center);
        if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
      });
      const total = totals[nearestIndex];
      if (total) { total[0] += sample[0]; total[1] += sample[1]; total[2] += sample[2]; total[3] += 1; }
    }
    centers.forEach((center, index) => {
      const total = totals[index];
      centers[index] = total && total[3] > 0 ? [total[0] / total[3], total[1] / total[3], total[2] / total[3]] : center;
    });
  }
  return centers;
};

const getClosestPaletteColor = (red: number, green: number, blue: number, palette: Rgb[] | null): Rgb => {
  if (!palette?.length) return [red, green, blue];
  const color: Rgb = [red, green, blue];
  return palette.reduce((closest, candidate) => squaredDistance(color, candidate) < squaredDistance(color, closest) ? candidate : closest);
};

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const averageCellColour = (data: Uint8ClampedArray, width: number, height: number, cellX: number, cellY: number, sampleWidth: number, sampleHeight: number) => {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  const left = Math.floor(cellX * sampleWidth);
  const top = Math.floor(cellY * sampleHeight);
  const right = Math.min(width, Math.ceil((cellX + 1) * sampleWidth));
  const bottom = Math.min(height, Math.ceil((cellY + 1) * sampleHeight));
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * width + x) * 4;
      red += data[offset] ?? 0;
      green += data[offset + 1] ?? 0;
      blue += data[offset + 2] ?? 0;
      count += 1;
    }
  }
  return [red / Math.max(1, count), green / Math.max(1, count), blue / Math.max(1, count)] as Rgb;
};

const renderToneField = (luminance: Float32Array, width: number, height: number, options: ArtOptions, levels: number) => {
  const base: ToneField = { values: luminance, width, height };
  const adjustments = { ...DEFAULT_IMAGE_ADJUSTMENTS, ...options.adjustments };
  const mode = options.renderMode ?? "density";
  // Density mode has no edge component, so avoid the Sobel pass in the common fast path.
  const edges = mode === "density" ? { values: new Float32Array(base.values.length), width, height } : sobelEdges(base);
  const combined = combineToneAndEdges(base, edges, options.invert, mode, adjustments.threshold);
  return applyDither(combined, options.ditherAlgorithm ?? "none", adjustments.ditherStrength, levels);
};

/**
 * Browser-side image conversion pipeline:
 * sample → image adjustments → Sobel/mode selection → dither → glyph mapping.
 */
export const generateArtFromCanvas = (sourceCanvas: HTMLCanvasElement, options: ArtOptions): GeneratedArt => {
  const palette = getPalette(options.palette);
  const isBraille = options.characterSet === "braille";
  const columns = clamp(options.columns, 24, 240);
  const rows = Math.max(1, Math.round((sourceCanvas.height / sourceCanvas.width) * columns * 0.55));
  const sampleWidth = isBraille ? columns * 2 : columns;
  const sampleHeight = isBraille ? rows * 4 : rows;
  const sampleCanvas = createCanvas(sampleWidth, sampleHeight);
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) throw new Error("Canvas 2D context is unavailable.");
  sampleContext.imageSmoothingEnabled = true;
  sampleContext.drawImage(sourceCanvas, 0, 0, sampleWidth, sampleHeight);

  const adjustments = { ...DEFAULT_IMAGE_ADJUSTMENTS, ...options.adjustments };
  const sampled = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const processed = adjustImageData(sampled, sampleWidth, sampleHeight, adjustments);
  const rawCharacters = getCharactersForSet(options.characterSet, options.customText);
  const genericGlyphs = orderGlyphsByDensity(rawCharacters);
  const toneField = renderToneField(processed.luminance, sampleWidth, sampleHeight, options, isBraille ? 1 : Math.max(1, genericGlyphs.length - 1));
  const imagePalette = options.colorMode === "colour" ? getImagePalette(processed.data, options.colorCount) : null;
  const lines: string[] = [];
  const colors: string[][] = [];
  const horizontalSample = sampleWidth / columns;
  const verticalSample = sampleHeight / rows;

  for (let row = 0; row < rows; row += 1) {
    let line = "";
    const rowColors: string[] = [];
    for (let column = 0; column < columns; column += 1) {
      const tone = isBraille
        ? BRAILLE_CELL_DENSITY(toneField, column, row)
        : toneField.values[row * sampleWidth + column] ?? 0;
      const glyph = isBraille ? brailleGlyphAt(toneField, column, row)
        : options.characterSet === "matrix" || options.characterSet === "symbols" || options.characterSet === "binary"
          ? textureGlyphForTone(tone, options.characterSet, column, row)
          : glyphForTone(tone, genericGlyphs);
      const [red, green, blue] = averageCellColour(processed.data, sampleWidth, sampleHeight, column, row, horizontalSample, verticalSample);
      const [displayRed, displayGreen, displayBlue] = getClosestPaletteColor(red, green, blue, imagePalette);
      line += glyph;
      rowColors.push(options.colorMode === "colour" ? toReadableColor(displayRed, displayGreen, displayBlue, tone) : palette.foreground);
    }
    lines.push(line);
    colors.push(rowColors);
  }
  return { lines, colors, columns, rows, foreground: palette.foreground, background: palette.background };
};

const BRAILLE_CELL_DENSITY = (field: ToneField, cellX: number, cellY: number) => {
  let total = 0;
  for (let dotY = 0; dotY < 4; dotY += 1) for (let dotX = 0; dotX < 2; dotX += 1) total += field.values[(cellY * 4 + dotY) * field.width + cellX * 2 + dotX] ?? 0;
  return total / 8;
};

export async function generateArtFromImage(image: HTMLImageElement, options: ArtOptions): Promise<GeneratedArt> {
  const sourceCanvas = createCanvas(image.naturalWidth, image.naturalHeight);
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) throw new Error("Canvas 2D context is unavailable.");
  sourceContext.drawImage(image, 0, 0);
  return generateArtFromCanvas(sourceCanvas, options);
}
