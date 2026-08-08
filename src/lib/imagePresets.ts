import {
  COLOR_COUNTS,
  DEFAULT_BACKGROUND_SEPARATION,
  DEFAULT_IMAGE_ADJUSTMENTS,
  PALETTES,
  type BackgroundSeparationOptions,
  type CharacterSetId,
  type ColorCount,
  type ColorMode,
  type PaletteId,
} from "@/lib/art";
import type { Background } from "@/lib/background";
import type { ColourTreatment } from "@/lib/colourTreatment";
import { DITHER_ALGORITHMS, RENDER_MODES, type DitherAlgorithm, type ImageAdjustments, type RenderMode } from "@/lib/renderer/types";
import type { CropPosition, FitMode } from "@/lib/renderer/sampling";

export type ImagePreset = {
  id: string;
  name: string;
  description: string;
  columns: number;
  characterSet: CharacterSetId;
  dither: DitherAlgorithm;
  renderMode: RenderMode;
  invert: boolean;
  palette: PaletteId;
  colorMode: ColorMode;
  colorCount: ColorCount;
  colourTreatment: ColourTreatment;
  adjustments: ImageAdjustments;
  backgroundSeparation: BackgroundSeparationOptions;
  background: Background;
  aspectFactor: number;
  fitMode: FitMode;
  cropPosition: CropPosition;
};

const noSeparation = { ...DEFAULT_BACKGROUND_SEPARATION };
const bw = PALETTES.find((palette) => palette.id === "bw")!;
const terminal = PALETTES.find((palette) => palette.id === "terminal")!;

export const IMAGE_PRESETS: readonly ImagePreset[] = [
  {
    id: "clean-ascii",
    name: "Clean ASCII",
    description: "Crisp source tones with no dithering and moderate contrast.",
    columns: 84,
    characterSet: "ascii",
    dither: "none",
    renderMode: "density",
    invert: true,
    palette: "bw",
    colorMode: "colour",
    colorCount: 0,
    colourTreatment: { kind: "source" },
    adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 14 },
    backgroundSeparation: noSeparation,
    background: { kind: "solid", colour: bw.background },
    aspectFactor: 0.6,
    fitMode: "stretch",
    cropPosition: "center",
  },
  {
    id: "classic-mac",
    name: "Classic Mac",
    description: "High-contrast Atkinson diffusion with a monochrome screen glow.",
    columns: 84,
    characterSet: "ascii",
    dither: "atkinson",
    renderMode: "density",
    invert: true,
    palette: "bw",
    colorMode: "monochrome",
    colorCount: 0,
    colourTreatment: { kind: "monochrome", colour: bw.foreground },
    adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 38, toneLevels: 4, sharpness: 12 },
    backgroundSeparation: noSeparation,
    background: { kind: "solid", colour: "#101010" },
    aspectFactor: 0.6,
    fitMode: "stretch",
    cropPosition: "center",
  },
  {
    id: "newspaper",
    name: "Newspaper",
    description: "Reduced-tone ordered dots with an ink-on-paper monochrome finish.",
    columns: 84,
    characterSet: "ascii",
    dither: "bayer4",
    renderMode: "density",
    invert: true,
    palette: "bw",
    colorMode: "monochrome",
    colorCount: 0,
    colourTreatment: { kind: "monochrome", colour: "#29251f" },
    adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 24, toneLevels: 4, preBlur: 0.35 },
    backgroundSeparation: noSeparation,
    background: { kind: "solid", colour: "#eee7d8" },
    aspectFactor: 0.6,
    fitMode: "stretch",
    cropPosition: "center",
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Dense Braille detail with smooth diffusion and green phosphor tones.",
    columns: 96,
    characterSet: "braille",
    dither: "floyd-steinberg",
    renderMode: "hybrid",
    invert: true,
    palette: "terminal",
    colorMode: "monochrome",
    colorCount: 0,
    colourTreatment: { kind: "monochrome", colour: terminal.foreground },
    adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 20, gamma: 0.9, sharpness: 18 },
    backgroundSeparation: noSeparation,
    background: { kind: "solid", colour: terminal.background },
    aspectFactor: 0.6,
    fitMode: "stretch",
    cropPosition: "center",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Blue-noise texture over neon colour ramps and a midnight gradient.",
    columns: 84,
    characterSet: "unicodeFine",
    dither: "blue-noise",
    renderMode: "hybrid",
    invert: true,
    palette: "blue",
    colorMode: "colour",
    colorCount: 0,
    colourTreatment: { kind: "gradient-map", stops: ["#07152d", "#6b2cff", "#ff3cac"] },
    adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 18, sharpness: 20, grain: 0.12, grainSeed: 1337 },
    backgroundSeparation: noSeparation,
    background: { kind: "linear", startColour: "#030712", endColour: "#24103f", angle: 315 },
    aspectFactor: 0.6,
    fitMode: "cover",
    cropPosition: "center",
  },
  {
    id: "game-boy",
    name: "Game Boy",
    description: "Four-tone ordered blocks with a compact handheld-console palette.",
    columns: 84,
    characterSet: "blocks",
    dither: "bayer2",
    renderMode: "density",
    invert: true,
    palette: "terminal",
    colorMode: "colour",
    colorCount: 4,
    colourTreatment: { kind: "palette", count: 4 },
    adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 28, toneLevels: 4, preBlur: 0.15 },
    backgroundSeparation: noSeparation,
    background: { kind: "solid", colour: "#9bbc0f" },
    aspectFactor: 0.7,
    fitMode: "contain",
    cropPosition: "center",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    description: "Directional edge drawing in a cool duotone drafting style.",
    columns: 84,
    characterSet: "symbols",
    dither: "sierra-lite",
    renderMode: "edge-direction",
    invert: true,
    palette: "blue",
    colorMode: "colour",
    colorCount: 0,
    colourTreatment: { kind: "duotone", shadowColour: "#06152b", highlightColour: "#8ed8ff" },
    adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 30, sharpness: 36, threshold: 0.12 },
    backgroundSeparation: { ...DEFAULT_BACKGROUND_SEPARATION, enabled: true, characterSet: "matrix", colour: "#2b6b92", threshold: 0.38, softness: 0.12 },
    background: { kind: "radial", innerColour: "#123b63", outerColour: "#020914", centerX: 0.5, centerY: 0.42, spread: 1.2 },
    aspectFactor: 0.6,
    fitMode: "cover",
    cropPosition: "center",
  },
];

export const isValidImagePreset = (preset: ImagePreset) =>
  preset.columns >= 24 &&
  preset.columns <= 240 &&
  preset.aspectFactor >= 0.25 &&
  preset.aspectFactor <= 2 &&
  DITHER_ALGORITHMS.includes(preset.dither) &&
  RENDER_MODES.includes(preset.renderMode) &&
  COLOR_COUNTS.includes(preset.colorCount) &&
  PALETTES.some((palette) => palette.id === preset.palette) &&
  preset.adjustments.toneLevels >= 0 &&
  preset.adjustments.toneLevels <= 16 &&
  preset.adjustments.grain >= 0 &&
  preset.adjustments.grain <= 1;
