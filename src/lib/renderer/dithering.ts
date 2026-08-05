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
  for (let row = 0; row < field.height; row += 1) {
    for (let column = 0; column < field.width; column += 1) {
      const threshold = ((matrix[row % size]?.[column % size] ?? 0) + 0.5) / (size * size) - 0.5;
      values[row * field.width + column] = quantize((field.values[row * field.width + column] ?? 0) + threshold * strength / Math.max(1, levels), levels);
    }
  }
  return { values, width: field.width, height: field.height };
};

const floydSteinberg = (field: ToneField, strength: number, levels: number): ToneField => {
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
      values[index] = mapped;
      const error = original - mapped;
      const direction = reverse ? -1 : 1;
      distribute(x + direction, y, error, 7 / 16);
      distribute(x - direction, y + 1, error, 3 / 16);
      distribute(x, y + 1, error, 5 / 16);
      distribute(x + direction, y + 1, error, 1 / 16);
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
  return floydSteinberg(field, safeStrength, safeLevels);
};
