import { describe, expect, it } from "vitest";
import { applyDither } from "@/lib/renderer/dithering";
import type { ToneField } from "@/lib/renderer/types";

const fixture = (): ToneField => ({
  width: 3,
  height: 2,
  values: new Float32Array([0, 0.2, 0.4, 0.6, 0.8, 1]),
});

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

    expect(Array.from(result.values)).toEqual(Array.from(input.values));
    expect(result.values).not.toBe(input.values);
  });
});
