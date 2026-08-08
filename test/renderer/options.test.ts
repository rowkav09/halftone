import { describe, expect, it } from "vitest";
import { applyGrain } from "@/lib/renderer/grain";
import { getSourceRegion } from "@/lib/renderer/sampling";

describe("image renderer options", () => {
  it("treats zero grain as an exact no-op", () => {
    const source = new Float32Array([0.1, 0.5, 0.9]);
    expect(applyGrain(source, 0, 123)).toBe(source);
  });

  it("generates deterministic grain that changes with the seed", () => {
    const source = new Float32Array(64).fill(0.5);
    expect(applyGrain(source, 0.4, 7)).toEqual(applyGrain(source, 0.4, 7));
    expect(applyGrain(source, 0.4, 7)).not.toEqual(applyGrain(source, 0.4, 8));
  });

  it("maps aspect factors toward taller or shorter grids", () => {
    const sourceAspect = 1;
    expect(Math.round(sourceAspect * 80 * 0.6)).toBe(48);
    expect(Math.round(sourceAspect * 80 * 1.2)).toBe(96);
  });

  it("stretches, contains, and covers source regions distinctly", () => {
    const stretch = getSourceRegion(400, 200, 200, 200, "stretch");
    expect(stretch.sourceWidth).toBe(400);
    expect(stretch.destinationWidth).toBe(200);

    const contain = getSourceRegion(400, 200, 200, 200, "contain");
    expect(contain.sourceWidth).toBe(400);
    expect(contain.destinationWidth).toBe(200);
    expect(contain.destinationHeight).toBe(100);
    expect(contain.destinationY).toBe(50);

    const cover = getSourceRegion(400, 200, 200, 200, "cover", "right");
    expect(cover.sourceHeight).toBe(200);
    expect(cover.sourceWidth).toBe(200);
    expect(cover.sourceX).toBe(200);
    expect(cover.destinationWidth).toBe(200);
  });
});
