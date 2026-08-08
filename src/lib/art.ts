import { applyDither } from "@/lib/renderer/dithering";
import { brailleGlyphAt, edgeDirectionGlyphForTone, glyphForTone, orderGlyphsByDensity, textureGlyphForTone } from "@/lib/renderer/glyphs";
import { adjustImageData, combineToneAndEdges, luminanceFromRgb, sobelEdgeDetails } from "@/lib/renderer/processing";
import { applyToneCurve } from "@/lib/renderer/tone";
import { backgroundRepresentativeColour, type Background, solidBackground } from "@/lib/background";
import { interpolateColour, isHexColour, rgbToHex, squaredDistance, type Rgb } from "@/lib/colour";
import { createColourTreatmentResolver, type ColourTreatment } from "@/lib/colourTreatment";
import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  DITHER_ALGORITHMS,
  DITHER_METADATA,
  RENDER_MODES,
  type DitherAlgorithm,
  type ImageAdjustments,
  type RenderMode,
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
export type BackgroundCharacterSetId = Exclude<CharacterSetId, "braille" | "custom">;
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

export type BackgroundSeparationOptions = {
  enabled: boolean;
  characterSet: BackgroundCharacterSetId;
  colour: string;
  threshold: number;
  softness: number;
};

export const DEFAULT_BACKGROUND_SEPARATION: BackgroundSeparationOptions = {
  enabled: false,
  characterSet: "matrix",
  colour: "#54717c",
  threshold: 0.42,
  softness: 0.16,
};

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
  backgroundSeparation?: BackgroundSeparationOptions;
  background?: Background;
  colourTreatment?: ColourTreatment;
};

export type GeneratedArt = {
  lines: string[];
  colors: string[][];
  columns: number;
  rows: number;
  foreground: string;
  background: Background;
  backgroundColour: string;
  colourTreatment: ColourTreatment;
};

export { DEFAULT_IMAGE_ADJUSTMENTS, DITHER_ALGORITHMS, DITHER_METADATA, RENDER_MODES };
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

const blendColors = (background: string, foreground: string, mix: number) => {
  if (!isHexColour(background) || !isHexColour(foreground)) return foreground;
  const from = [Number.parseInt(background.slice(1, 3), 16), Number.parseInt(background.slice(3, 5), 16), Number.parseInt(background.slice(5, 7), 16)] as const;
  const to = [Number.parseInt(foreground.slice(1, 3), 16), Number.parseInt(foreground.slice(3, 5), 16), Number.parseInt(foreground.slice(5, 7), 16)] as const;
  return rgbToHex(
    from[0] + (to[0] - from[0]) * mix,
    from[1] + (to[1] - from[1]) * mix,
    from[2] + (to[2] - from[2]) * mix,
  );
};

// Dark source pixels still need enough light to be legible on the black canvas.
const toReadableColor = (red: number, green: number, blue: number, tone: number) => {
  const lift = 0.32 + 0.5 * clamp(tone, 0, 1);
  return rgbToHex(red + (235 - red) * lift, green + (242 - green) * lift, blue + (255 - blue) * lift);
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
  return palette.reduce((closest, candidate) => {
    const distance = squaredDistance(color, candidate);
    const closestDistance = squaredDistance(color, closest);
    return distance < closestDistance ? candidate : closest;
  });
};

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/** A tiny source-space blur prevents sharp source pixels from locking to a glyph grid. */
const prefilterImageData = (source: Uint8ClampedArray, width: number, height: number, amount: number) => {
  if (amount <= 0) return source;
  const output = new Uint8ClampedArray(source.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const target = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        let total = 0;
        let weight = 0;
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const sampleX = Math.min(width - 1, Math.max(0, x + offsetX));
            const sampleY = Math.min(height - 1, Math.max(0, y + offsetY));
            const sampleWeight = offsetX === 0 && offsetY === 0 ? 4 : 1;
            total += (source[(sampleY * width + sampleX) * 4 + channel] ?? 0) * sampleWeight;
            weight += sampleWeight;
          }
        }
        const original = source[target + channel] ?? 0;
        output[target + channel] = Math.round(original * (1 - amount) + total / weight * amount);
      }
    }
  }
  return output;
};

/** Explicit weighted box sampling keeps every output cell independent of source-grid alignment. */
const areaAverageImageData = (source: Uint8ClampedArray, sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) => {
  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const top = targetY * sourceHeight / targetHeight;
    const bottom = (targetY + 1) * sourceHeight / targetHeight;
    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const left = targetX * sourceWidth / targetWidth;
      const right = (targetX + 1) * sourceWidth / targetWidth;
      const totals = [0, 0, 0, 0];
      let weight = 0;
      for (let sourceY = Math.floor(top); sourceY < Math.ceil(bottom); sourceY += 1) {
        const yOverlap = Math.max(0, Math.min(bottom, sourceY + 1) - Math.max(top, sourceY));
        for (let sourceX = Math.floor(left); sourceX < Math.ceil(right); sourceX += 1) {
          const xOverlap = Math.max(0, Math.min(right, sourceX + 1) - Math.max(left, sourceX));
          const sampleWeight = xOverlap * yOverlap;
          const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
          for (let channel = 0; channel < 4; channel += 1) totals[channel] += (source[sourceIndex + channel] ?? 0) * sampleWeight;
          weight += sampleWeight;
        }
      }
      const target = (targetY * targetWidth + targetX) * 4;
      for (let channel = 0; channel < 4; channel += 1) output[target + channel] = Math.round(totals[channel] / Math.max(weight, 1));
    }
  }
  return output;
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

const renderToneField = (luminance: Float32Array, width: number, height: number, options: ArtOptions, glyphCount: number, isBraille: boolean) => {
  const base: ToneField = { values: luminance, width, height };
  const adjustments = { ...DEFAULT_IMAGE_ADJUSTMENTS, ...options.adjustments };
  const mode = options.renderMode ?? "density";
  // Density mode has no edge component, so avoid the Sobel pass in the common fast path.
  const edgeDetails = mode === "density" ? null : sobelEdgeDetails(base);
  const edges = edgeDetails?.edge ?? { values: new Float32Array(base.values.length), width, height };
  const combined = combineToneAndEdges(base, edges, options.invert, mode, adjustments.threshold);
  const algorithm = options.ditherAlgorithm ?? "none";
  const automaticLevels = algorithm === "none" ? glyphCount - 1 : Math.min(glyphCount - 1, 8);
  const levels = isBraille ? 1 : adjustments.toneLevels >= 2
    ? clamp(Math.round(adjustments.toneLevels), 2, 16)
    : Math.max(1, automaticLevels);
  return { tone: applyDither(applyToneCurve(combined), algorithm, adjustments.ditherStrength, levels), directions: edgeDetails?.directions ?? null };
};

const smoothstep = (edgeStart: number, edgeEnd: number, value: number) => {
  if (edgeStart >= edgeEnd) return value >= edgeStart ? 1 : 0;
  const step = clamp((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);
  return step * step * (3 - 2 * step);
};

/**
 * A lightweight, deterministic foreground likelihood. It favours pixels that
 * differ from the frame, have an edge, or sit away from the border. It is an
 * artistic separator rather than a claim of semantic subject detection.
 */
const createForegroundLikelihood = (data: Uint8ClampedArray, luminance: Float32Array, width: number, height: number): ToneField => {
  let borderRed = 0;
  let borderGreen = 0;
  let borderBlue = 0;
  let borderCount = 0;
  const addBorder = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    borderRed += data[index] ?? 0;
    borderGreen += data[index + 1] ?? 0;
    borderBlue += data[index + 2] ?? 0;
    borderCount += 1;
  };
  for (let x = 0; x < width; x += 1) { addBorder(x, 0); if (height > 1) addBorder(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { addBorder(0, y); if (width > 1) addBorder(width - 1, y); }
  const baseRed = borderRed / Math.max(1, borderCount);
  const baseGreen = borderGreen / Math.max(1, borderCount);
  const baseBlue = borderBlue / Math.max(1, borderCount);
  const edges = sobelEdgeDetails({ values: luminance, width, height }).edge.values;
  const values = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const colorIndex = index * 4;
      const red = data[colorIndex] ?? 0;
      const green = data[colorIndex + 1] ?? 0;
      const blue = data[colorIndex + 2] ?? 0;
      const colourDistance = Math.sqrt((red - baseRed) ** 2 + (green - baseGreen) ** 2 + (blue - baseBlue) ** 2) / 441.7;
      const normalX = (x + 0.5) / width - 0.5;
      const normalY = (y + 0.5) / height - 0.5;
      const centreWeight = 1 - clamp(Math.hypot(normalX, normalY) / 0.707, 0, 1);
      values[index] = clamp(colourDistance * 0.62 + (edges[index] ?? 0) * 0.31 + centreWeight * 0.07, 0, 1);
    }
  }
  return { values, width, height };
};

/**
 * Browser-side image conversion pipeline:
 * sample → image adjustments → Sobel/mode selection → dither → glyph mapping.
 */
export const generateArtFromCanvas = (sourceCanvas: HTMLCanvasElement, options: ArtOptions): GeneratedArt => {
  const palette = getPalette(options.palette);
  const isBraille = options.characterSet === "braille";
  const columns = clamp(options.columns, 24, 240);
  // Canvas glyphs are approximately 0.6 as wide as they are tall, so rows
  // must be derived from that physical cell ratio instead of source pixels.
  const rows = Math.max(1, Math.round((sourceCanvas.height / sourceCanvas.width) * columns * 0.6));
  const sampleWidth = isBraille ? columns * 2 : columns;
  const sampleHeight = isBraille ? rows * 4 : rows;
  const oversample = 2;
  const sourceSampleWidth = sampleWidth * oversample;
  const sourceSampleHeight = sampleHeight * oversample;
  const sampleCanvas = createCanvas(sourceSampleWidth, sourceSampleHeight);
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) throw new Error("Canvas 2D context is unavailable.");
  sampleContext.imageSmoothingEnabled = true;
  sampleContext.imageSmoothingQuality = "high";
  sampleContext.drawImage(sourceCanvas, 0, 0, sourceSampleWidth, sourceSampleHeight);

  const adjustments = { ...DEFAULT_IMAGE_ADJUSTMENTS, ...options.adjustments };
  const sampled = sampleContext.getImageData(0, 0, sourceSampleWidth, sourceSampleHeight).data;
  const prefiltered = prefilterImageData(sampled, sourceSampleWidth, sourceSampleHeight, adjustments.preBlur);
  const downsampled = areaAverageImageData(prefiltered, sourceSampleWidth, sourceSampleHeight, sampleWidth, sampleHeight);
  const processed = adjustImageData(downsampled, sampleWidth, sampleHeight, adjustments);
  const rawCharacters = getCharactersForSet(options.characterSet, options.customText);
  const genericGlyphs = orderGlyphsByDensity(rawCharacters);
  const { tone: toneField, directions } = renderToneField(processed.luminance, sampleWidth, sampleHeight, options, Math.max(1, genericGlyphs.length - 1), isBraille);
  const treatment: ColourTreatment = options.colourTreatment ?? (options.colorMode === "colour"
    ? { kind: "source" }
    : { kind: "monochrome", colour: palette.foreground });
  const imagePalette = getImagePalette(processed.data, options.colorCount);
  const resolveColour = createColourTreatmentResolver(treatment, imagePalette ?? []);
  const separation = options.backgroundSeparation?.enabled ? options.backgroundSeparation : null;
  const backgroundGlyphs = separation ? orderGlyphsByDensity(getCharactersForSet(separation.characterSet, "")) : [];
  const foregroundLikelihood = separation ? createForegroundLikelihood(processed.data, processed.luminance, sampleWidth, sampleHeight) : null;
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
      const direction = directions?.[isBraille ? (row * 4 + 1) * sampleWidth + column * 2 + 1 : row * sampleWidth + column] ?? 0;
      const foregroundGlyph = options.renderMode === "edge-direction" ? edgeDirectionGlyphForTone(tone, direction)
        : isBraille ? brailleGlyphAt(toneField, column, row)
        : options.characterSet === "matrix" || options.characterSet === "symbols" || options.characterSet === "binary"
          ? textureGlyphForTone(tone, options.characterSet, column, row)
          : glyphForTone(tone, genericGlyphs);
      const likelihood = foregroundLikelihood ? isBraille ? BRAILLE_CELL_DENSITY(foregroundLikelihood, column, row) : foregroundLikelihood.values[row * sampleWidth + column] ?? 0 : 1;
      const foregroundMix = separation ? smoothstep(separation.threshold - separation.softness, separation.threshold + separation.softness, likelihood) : 1;
      const backgroundGlyph = separation
        ? separation.characterSet === "matrix" || separation.characterSet === "symbols" || separation.characterSet === "binary"
          ? textureGlyphForTone(tone, separation.characterSet, column, row)
          : glyphForTone(tone, backgroundGlyphs)
        : foregroundGlyph;
      const glyph = foregroundMix >= 0.5 ? foregroundGlyph : backgroundGlyph;
      const [red, green, blue] = averageCellColour(processed.data, sampleWidth, sampleHeight, column, row, horizontalSample, verticalSample);
      const [displayRed, displayGreen, displayBlue] = getClosestPaletteColor(red, green, blue, imagePalette);
      line += glyph;
      const readableSource = toReadableColor(displayRed, displayGreen, displayBlue, tone);
      const sourceLuminance = luminanceFromRgb(red, green, blue) / 255;
      const foregroundColour = resolveColour([displayRed, displayGreen, displayBlue], sourceLuminance, readableSource);
      rowColors.push(separation ? blendColors(separation.colour, foregroundColour, foregroundMix) : foregroundColour);
    }
    lines.push(line);
    colors.push(rowColors);
  }
  const background = options.background ?? solidBackground(palette.background);
  return { lines, colors, columns, rows, foreground: palette.foreground, background, backgroundColour: backgroundRepresentativeColour(background, palette.background), colourTreatment: treatment };
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
