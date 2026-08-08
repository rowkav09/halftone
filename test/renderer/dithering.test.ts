import { describe, expect, it } from "vitest";
import { generateBlueNoiseRanks } from "@/lib/renderer/blueNoise";
import { applyDither } from "@/lib/renderer/dithering";
import type { ToneField } from "@/lib/renderer/types";

const fixture = (): ToneField => ({
  width: 3,
  height: 2,
  values: new Float32Array([0, 0.2, 0.4, 0.6, 0.8, 1]),
});

const gradient = (width = 96, height = 48): ToneField => {
  const values = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) values[y * width + x] = x / (width - 1);
  return { values, width, height };
};

const differenceFraction = (first: ToneField, second: ToneField) => {
  let different = 0;
  for (let index = 0; index < first.values.length; index += 1) if (first.values[index] !== second.values[index]) different += 1;
  return different / first.values.length;
};

describe("applyDither", () => {
  it.each(["bayer2", "bayer4", "bayer8", "blue-noise", "floyd-steinberg", "atkinson", "sierra-lite"] as const)("is deterministic for %s", (algorithm) => {
    const first = applyDither(fixture(), algorithm, 0.65, 4);
    const second = applyDither(fixture(), algorithm, 0.65, 4);

    expect(Array.from(first.values)).toEqual(Array.from(second.values));
    expect(first).toMatchObject({ width: 3, height: 2 });
    expect(Array.from(first.values).every((value) => value >= 0 && value <= 1)).toBe(true);
  });

  it("returns a copied field when disabled", () => {
    const input = fixture();
    const result = applyDither(input, "none", 1, 4);

    expect(Array.from(result.values)).toEqual([0, 0.25, 0.5, 0.5, 0.75, 1]);
    expect(result.values).not.toBe(input.values);
  });

  it.each(["bayer2", "bayer4", "bayer8", "blue-noise", "floyd-steinberg", "atkinson", "sierra-lite"] as const)("strength zero is plain quantisation for %s", (algorithm) => {
    const plain = applyDither(fixture(), "none", 1, 4);
    const result = applyDither(fixture(), algorithm, 0, 4);
    expect(Array.from(result.values)).toEqual(Array.from(plain.values));
  });

  it.each(["none", "bayer2", "bayer4", "bayer8", "blue-noise", "floyd-steinberg", "atkinson", "sierra-lite"] as const)("values stay on the quantisation lattice for %s", (algorithm) => {
    const result = applyDither(fixture(), algorithm, 0.65, 4);
    expect(Array.from(result.values).every((value) => Math.abs(value * 4 - Math.round(value * 4)) < 1e-6)).toBe(true);
  });

  it("preserves one-cell dimensions", () => {
    const field: ToneField = { width: 1, height: 1, values: new Float32Array([0.47]) };
    for (const algorithm of ["none", "bayer2", "bayer4", "bayer8", "blue-noise", "floyd-steinberg", "atkinson", "sierra-lite"] as const) {
      const result = applyDither(field, algorithm, 1, 4);
      expect(result.values.length).toBe(1);
      expect(result.values[0]).toBeGreaterThanOrEqual(0);
      expect(result.values[0]).toBeLessThanOrEqual(1);
    }
  });

  it("keeps ordered matrix patterns distinct", () => {
    const field = gradient();
    const bayer2 = applyDither(field, "bayer2", 1, 8);
    const bayer4 = applyDither(field, "bayer4", 1, 8);
    const bayer8 = applyDither(field, "bayer8", 1, 8);
    expect(differenceFraction(bayer2, bayer4)).toBeGreaterThan(0.01);
    expect(differenceFraction(bayer4, bayer8)).toBeGreaterThan(0.01);
    expect(differenceFraction(bayer2, bayer8)).toBeGreaterThan(0.01);
  });

  it("keeps error diffusion variants distinct", () => {
    const field = gradient();
    const outputs = ["floyd-steinberg", "atkinson", "sierra-lite"].map((algorithm) => applyDither(field, algorithm as "floyd-steinberg" | "atkinson" | "sierra-lite", 1, 8));
    expect(differenceFraction(outputs[0]!, outputs[1]!)).toBeGreaterThan(0.05);
    expect(differenceFraction(outputs[0]!, outputs[2]!)).toBeGreaterThan(0.05);
    expect(differenceFraction(outputs[1]!, outputs[2]!)).toBeGreaterThan(0.05);
  });

  it("keeps blue noise unlike Bayer on a flat patch", () => {
    const field: ToneField = { width: 32, height: 32, values: new Float32Array(32 * 32).fill(0.3) };
    const blue = applyDither(field, "blue-noise", 1, 2);
    for (const algorithm of ["bayer2", "bayer4", "bayer8"] as const) {
      const ordered = applyDither(field, algorithm, 1, 2);
      expect(differenceFraction(blue, ordered)).toBeGreaterThan(0.2);
    }
  });

  it("generates a permutation with stronger spacing than white noise", () => {
    const size = 32;
    const ranks = generateBlueNoiseRanks(size);
    expect(new Set(ranks).size).toBe(size * size);
    expect(Math.min(...ranks)).toBe(0);
    expect(Math.max(...ranks)).toBe(size * size - 1);
    const energy = (occupied: number[]) => {
      let total = 0;
      let count = 0;
      for (let index = 0; index < occupied.length; index += 1) {
        if (!occupied[index]) continue;
        let local = 0;
        for (let yOffset = -5; yOffset <= 5; yOffset += 1) {
          for (let xOffset = -5; xOffset <= 5; xOffset += 1) {
            if (xOffset === 0 && yOffset === 0) continue;
            const x = (index % size + xOffset + size) % size;
            const y = (Math.floor(index / size) + yOffset + size) % size;
            if (occupied[y * size + x]) {
              local += Math.exp(-(xOffset ** 2 + yOffset ** 2) / (2 * 1.7 ** 2));
            }
          }
        }
        total += local;
        count += 1;
      }
      return total / count;
    };
    const white = new Array<number>(size * size).fill(0);
    let state = 0x6d2b79f5;
    for (let index = 0; index < ranks.length; index += 1) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      if ((state >>> 0) / 0x100000000 < 0.5) white[index] = 1;
    }
    const blue = Array.from(ranks, (rank) => rank < size * size / 2 ? 1 : 0);
    expect(energy(blue)).toBeLessThan(energy(white));
  });
});
