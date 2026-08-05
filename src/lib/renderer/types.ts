export const DITHER_ALGORITHMS = ["none", "bayer2", "bayer4", "bayer8", "floyd-steinberg"] as const;

export type DitherAlgorithm = (typeof DITHER_ALGORITHMS)[number];

export const RENDER_MODES = ["density", "edge", "hybrid"] as const;

export type RenderMode = (typeof RENDER_MODES)[number];

export type ImageAdjustments = {
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  /** A value of 0 leaves continuous tones intact; values above it create a hard cut-off. */
  threshold: number;
  ditherStrength: number;
  sharpness: number;
  blur: number;
};

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  gamma: 1,
  saturation: 1,
  threshold: 0,
  ditherStrength: 1,
  sharpness: 0,
  blur: 0,
};

export type ToneField = {
  values: Float32Array;
  width: number;
  height: number;
};

export type Rgb = readonly [number, number, number];
