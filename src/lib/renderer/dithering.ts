import { BLUE_NOISE_SIZE, getBlueNoiseRanks } from "@/lib/renderer/blueNoise";
import type { DitherAlgorithm, ToneField } from "@/lib/renderer/types";

const BAYER_2 = [[0, 2], [3, 1]];
const BAYER_4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const buildBayer8 = () => {
  let matrix = BAYER_2;
  while (matrix.length < 8) {
    const size = matrix.length;
    const next = Array.from({ length: size * 2 }, () => Array<number>(size * 2).fill(0));
    for (let row = 0; row < size; row += 1) for (let column = 0; column < size; column += 1) {
      const value = matrix[row]?.[column] ?? 0;
      next[row][column] = value * 4;
      next[row][column + size] = value * 4 + 2;
      next[row + size][column] = value * 4 + 3;
      next[row + size][column + size] = value * 4 + 1;
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
  const scale = 1 / Math.max(1, levels);
  for (let row = 0; row < field.height; row += 1) for (let column = 0; column < field.width; column += 1) {
    const rank = matrix[row % size]?.[column % size] ?? 0;
    const threshold = (rank + 0.5) / (size * size) - 0.5;
    const index = row * field.width + column;
    values[index] = quantize((field.values[index] ?? 0) + threshold * scale * strength, levels);
  }
  return { values, width: field.width, height: field.height };
};

const diffuse = (field: ToneField, strength: number, levels: number, taps: Array<[number, number, number]>): ToneField => {
  const working = new Float32Array(field.values);
  const values = new Float32Array(field.values.length);
  const distribute = (x: number, y: number, error: number, weight: number) => {
    if (x < 0 || y < 0 || x >= field.width || y >= field.height) return;
    working[y * field.width + x] = (working[y * field.width + x] ?? 0) + error * weight * strength;
  };
  for (let y = 0; y < field.height; y += 1) {
    const reverse = y % 2 === 1;
    for (let offset = 0; offset < field.width; offset += 1) {
      const x = reverse ? field.width - offset - 1 : offset;
      const index = y * field.width + x;
      const original = working[index] ?? 0;
      const mapped = quantize(original, levels);
      values[index] = mapped;
      const direction = reverse ? -1 : 1;
      taps.forEach(([offsetX, offsetY, weight]) => distribute(x + offsetX * direction, y + offsetY, original - mapped, weight));
    }
  }
  return { values, width: field.width, height: field.height };
};
const floydSteinberg = (field: ToneField, strength: number, levels: number) => diffuse(field, strength, levels, [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]]);
const atkinson = (field: ToneField, strength: number, levels: number) => diffuse(field, strength, levels, [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]);
const sierraLite = (field: ToneField, strength: number, levels: number) => diffuse(field, strength, levels, [[1, 0, 2 / 4], [-1, 1, 1 / 4], [0, 1, 1 / 4]]);

const blueNoiseDither = (field: ToneField, strength: number, levels: number): ToneField => {
  const values = new Float32Array(field.values.length);
  const ranks = getBlueNoiseRanks();
  const scale = 1 / Math.max(1, levels);
  for (let row = 0; row < field.height; row += 1) for (let column = 0; column < field.width; column += 1) {
    const threshold = ((ranks[(row % BLUE_NOISE_SIZE) * BLUE_NOISE_SIZE + column % BLUE_NOISE_SIZE] ?? 0) + 0.5) / ranks.length - 0.5;
    const index = row * field.width + column;
    values[index] = quantize((field.values[index] ?? 0) + threshold * scale * strength, levels);
  }
  return { values, width: field.width, height: field.height };
};

export const applyDither = (field: ToneField, algorithm: DitherAlgorithm, strength: number, levels: number): ToneField => {
  const safeLevels = Math.max(1, Math.round(levels));
  const safeStrength = clamp(strength);
  if (algorithm === "none" || safeStrength === 0) {
    const values = new Float32Array(field.values.length);
    for (let index = 0; index < values.length; index += 1) values[index] = quantize(field.values[index] ?? 0, safeLevels);
    return { values, width: field.width, height: field.height };
  }
  if (algorithm === "bayer2") return orderedDither(field, BAYER_2, safeStrength, safeLevels);
  if (algorithm === "bayer4") return orderedDither(field, BAYER_4, safeStrength, safeLevels);
  if (algorithm === "bayer8") return orderedDither(field, BAYER_8, safeStrength, safeLevels);
  if (algorithm === "blue-noise") return blueNoiseDither(field, safeStrength, safeLevels);
  if (algorithm === "atkinson") return atkinson(field, safeStrength, safeLevels);
  if (algorithm === "sierra-lite") return sierraLite(field, safeStrength, safeLevels);
  return floydSteinberg(field, safeStrength, safeLevels);
};
