export const DITHER_ALGORITHMS = ["none", "bayer2", "bayer4", "bayer8", "blue-noise", "floyd-steinberg", "atkinson", "sierra-lite"] as const;

export type DitherAlgorithm = (typeof DITHER_ALGORITHMS)[number];

export const RENDER_MODES = ["density", "edge", "edge-direction", "hybrid"] as const;

export type RenderMode = (typeof RENDER_MODES)[number];

export type ImageAdjustments = {
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  /** A value of 0 leaves continuous tones intact; values above it create a hard cut-off. */
  threshold: number;
  ditherStrength: number;
  /** Gentle source-space filtering applied before area downsampling. */
  preBlur: number;
  sharpness: number;
  blur: number;
  /** Custom character aspect ratio correction. Default is 0.6. */
  aspectRatio: number;
  /** Fitting modes for the source image. */
  fitMode: "contain" | "cover" | "stretch";
  cropX: number; // 0 to 100 (default 50)
  cropY: number; // 0 to 100 (default 50)
  /** Pre-dither noise/grain. */
  grainAmount: number; // 0 to 1 (default 0)
  grainSeed: number; // default 42
  /** Posterization level override separate from glyph count. 0 means use glyph count. */
  posteriseLevels: number;
};

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 1,
  threshold: 0,
  ditherStrength: 1,
  preBlur: 0.25,
  sharpness: 0,
  blur: 0,
  aspectRatio: 0.6,
  fitMode: "stretch",
  cropX: 50,
  cropY: 50,
  grainAmount: 0,
  grainSeed: 42,
  posteriseLevels: 0,
};

export type ToneField = {
  values: Float32Array;
  width: number;
  height: number;
};

export type Rgb = readonly [number, number, number];

export type BackgroundType = "solid" | "linear" | "radial" | "transparent";

export type BackgroundConfig = {
  type: BackgroundType;
  solidColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number; // 0, 45, 90, 135, 180, etc.
  gradientMidpoint: number; // 0 to 1
  radialInner: string;
  radialOuter: string;
  radialCenterX: number; // 0 to 100
  radialCenterY: number; // 0 to 100
  radialSpread: number; // 10 to 200
};

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  type: "solid",
  solidColor: "#070b14", // BW palette background
  gradientStart: "#101f30",
  gradientEnd: "#040810",
  gradientAngle: 180,
  gradientMidpoint: 0.5,
  radialInner: "#152a3a",
  radialOuter: "#050a12",
  radialCenterX: 50,
  radialCenterY: 50,
  radialSpread: 100,
};

export type ColorTreatmentType = "source" | "monochrome" | "palette" | "duotone" | "gradient-map";

export type ColorTreatmentConfig = {
  type: ColorTreatmentType;
  duotoneShadow: string;
  duotoneHighlight: string;
  gradientMapStops: string[]; // 2 to 4 colors
  paletteColors: string[]; // Game Boy or custom palette
};

export const DEFAULT_COLOR_TREATMENT_CONFIG: ColorTreatmentConfig = {
  type: "source",
  duotoneShadow: "#050314",
  duotoneHighlight: "#55ffaa",
  gradientMapStops: ["#110022", "#990066", "#ff5533", "#ffffaa"],
  paletteColors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"], // Game Boy Green
};
