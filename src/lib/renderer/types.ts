export const DITHER_ALGORITHMS = ["none", "bayer2", "bayer4", "bayer8", "blue-noise", "floyd-steinberg", "atkinson", "sierra-lite"] as const;

export type DitherAlgorithm = (typeof DITHER_ALGORITHMS)[number];

export type DitherGroup = "none" | "ordered" | "diffusion" | "noise";

export const DITHER_METADATA = {
  none: { group: "none", description: "Direct tone quantisation with no added pattern." },
  bayer2: { group: "ordered", description: "Tight repeating pattern with a crisp, high-contrast retro texture." },
  bayer4: { group: "ordered", description: "Repeating ordered pattern with crisp retro texture." },
  bayer8: { group: "ordered", description: "Larger repeating pattern with smoother ordered shading." },
  "blue-noise": { group: "noise", description: "Irregular, even texture that hides patterning in photographic detail." },
  "floyd-steinberg": { group: "diffusion", description: "Smooth error diffusion with fine photographic detail." },
  atkinson: { group: "diffusion", description: "Higher contrast, lighter diffusion inspired by classic Macintosh graphics." },
  "sierra-lite": { group: "diffusion", description: "Lightweight error diffusion with a clean, gently textured finish." },
} satisfies Record<DitherAlgorithm, { group: DitherGroup; description: string }>;

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
  /** Quantisation levels; zero selects an algorithm-dependent automatic value. */
  toneLevels: number;
  /** Gentle source-space filtering applied before area downsampling. */
  preBlur: number;
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
  toneLevels: 0,
  preBlur: 0.25,
  sharpness: 0,
  blur: 0,
};

export type ToneField = {
  values: Float32Array;
  width: number;
  height: number;
};

export type Rgb = readonly [number, number, number];
