import type { DitherAlgorithm, ToneField } from "@/lib/renderer/types";

const BAYER_2 = [
  [0, 2],
  [3, 1],
];

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const buildBayer8 = () => {
  let matrix = BAYER_2;
  while (matrix.length < 8) {
    const size = matrix.length;
    const next = Array.from({ length: size * 2 }, () => Array<number>(size * 2).fill(0));
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const base = matrix[row]?.[column] ?? 0;
        next[row][column] = base * 4;
        next[row][column + size] = base * 4 + 2;
        next[row + size][column] = base * 4 + 3;
        next[row + size][column + size] = base * 4 + 1;
      }
    }
    matrix = next;
  }
  return matrix;
};

const BAYER_8 = buildBayer8();
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const quantize = (value: number, levels: number) => Math.round(clamp(value) * levels) / levels;

const orderedDither = (field: ToneField, matrix: number[][], strength: number, levels: number): ToneField => {
  const values = new Float32Array(field.values.length);
  const size = matrix.length;
  const dimensionHash = (((field.width * 73856093) ^ (field.height * 19349663)) >>> 0);
  const rowOffset = dimensionHash % size;
  const columnOffset = (dimensionHash >>> 8) % size;
  // Ordered patterns need less influence when their period is conspicuous at
  // either end of the resolution range.
  const resolutionDistance = Math.min(1, Math.abs(Math.log2(Math.max(1, field.width) / 112)) / 1.25);
  const adjustedStrength = strength * (1 - resolutionDistance * 0.38);
  for (let row = 0; row < field.height; row += 1) {
    for (let column = 0; column < field.width; column += 1) {
      const threshold = ((matrix[(row + rowOffset) % size]?.[(column + columnOffset) % size] ?? 0) + 0.5) / (size * size) - 0.5;
      const source = field.values[row * field.width + column] ?? 0;
      const dithered = quantize(source + threshold / Math.max(1, levels), levels);
      // Preserve part of the continuous tone field instead of turning the
      // Bayer threshold into a hard grid of levels.
      values[row * field.width + column] = source * (1 - adjustedStrength) + dithered * adjustedStrength;
    }
  }
  return { values, width: field.width, height: field.height };
};

const diffuse = (field: ToneField, strength: number, levels: number, taps: Array<[number, number, number]>): ToneField => {
  const working = new Float32Array(field.values);
  const values = new Float32Array(field.values.length);
  const distribute = (x: number, y: number, error: number, weight: number) => {
    if (x < 0 || y < 0 || x >= field.width || y >= field.height) return;
    const index = y * field.width + x;
    working[index] = clamp((working[index] ?? 0) + error * weight * strength);
  };

  for (let y = 0; y < field.height; y += 1) {
    const reverse = y % 2 === 1;
    for (let offset = 0; offset < field.width; offset += 1) {
      const x = reverse ? field.width - offset - 1 : offset;
      const index = y * field.width + x;
      const original = working[index] ?? 0;
      const mapped = quantize(original, levels);
      values[index] = original * (1 - strength) + mapped * strength;
      const error = original - mapped;
      const direction = reverse ? -1 : 1;
      taps.forEach(([offsetX, offsetY, weight]) => distribute(x + offsetX * direction, y + offsetY, error, weight));
    }
  }
  return { values, width: field.width, height: field.height };
};

const floydSteinberg = (field: ToneField, strength: number, levels: number) => diffuse(field, strength, levels, [
  [1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16],
]);

const atkinson = (field: ToneField, strength: number, levels: number) => diffuse(field, strength, levels, [
  [1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8],
]);

const sierraLite = (field: ToneField, strength: number, levels: number) => diffuse(field, strength, levels, [
  [1, 0, 2 / 4], [-1, 1, 1 / 4], [0, 1, 1 / 4],
]);

const blueNoiseThreshold = (column: number, row: number, seed: number) => {
  const first = Math.sin((column + seed * 0.01) * 12.9898 + (row + seed * 0.02) * 78.233) * 43758.5453;
  const second = Math.sin((column + 19) * 39.3467 + (row + 7) * 11.135) * 24634.6345;
  return ((first - Math.floor(first)) + (second - Math.floor(second)) * 0.5) % 1 - 0.5;
};

const blueNoiseDither = (field: ToneField, strength: number, levels: number): ToneField => {
  const values = new Float32Array(field.values.length);
  const seed = ((field.width * 83492791) ^ (field.height * 2971215073)) >>> 0;
  for (let row = 0; row < field.height; row += 1) {
    for (let column = 0; column < field.width; column += 1) {
      const index = row * field.width + column;
      const source = field.values[index] ?? 0;
      const dithered = quantize(source + blueNoiseThreshold(column, row, seed) / Math.max(1, levels), levels);
      values[index] = source * (1 - strength) + dithered * strength;
    }
  }
  return { values, width: field.width, height: field.height };
};

/** All ditherers receive and return the same glyph-space tone field. */
export const applyDither = (field: ToneField, algorithm: DitherAlgorithm, strength: number, levels: number): ToneField => {
  const safeLevels = Math.max(1, Math.round(levels));
  const safeStrength = Math.min(1, Math.max(0, strength));
  if (algorithm === "none" || safeStrength === 0) return { values: new Float32Array(field.values), width: field.width, height: field.height };
  if (algorithm === "bayer2") return orderedDither(field, BAYER_2, safeStrength, safeLevels);
  if (algorithm === "bayer4") return orderedDither(field, BAYER_4, safeStrength, safeLevels);
  if (algorithm === "bayer8") return orderedDither(field, BAYER_8, safeStrength, safeLevels);
  if (algorithm === "blue-noise") return blueNoiseDither(field, safeStrength, safeLevels);
  if (algorithm === "atkinson") return atkinson(field, safeStrength, safeLevels);
  if (algorithm === "sierra-lite") return sierraLite(field, safeStrength, safeLevels);
  return floydSteinberg(field, safeStrength, safeLevels);
};
