import { describe, expect, it } from "vitest";
import { adjustImageData, combineToneAndEdges, luminanceFromRgb, sobelEdgeDetails } from "@/lib/renderer/processing";
import { DEFAULT_IMAGE_ADJUSTMENTS, type ToneField } from "@/lib/renderer/types";

describe("renderer processing", () => {
  it("uses perceptual RGB luminance", () => {
    expect(luminanceFromRgb(255, 255, 255)).toBeCloseTo(1);
    expect(luminanceFromRgb(255, 0, 0)).toBeCloseTo(0.2126);
  });

  it("adjusts pixels reproducibly without mutating the source", () => {
    const source = new Uint8ClampedArray([10, 20, 30, 255, 220, 180, 140, 255]);
    const adjustments = { ...DEFAULT_IMAGE_ADJUSTMENTS, brightness: 12, contrast: 8, gamma: 1.2, preBlur: 1 };
    const first = adjustImageData(source, 2, 1, adjustments);
    const second = adjustImageData(source, 2, 1, adjustments);

    expect(Array.from(first.data)).toEqual(Array.from(second.data));
    expect(Array.from(first.luminance)).toEqual(Array.from(second.luminance));
    expect(Array.from(source)).toEqual([10, 20, 30, 255, 220, 180, 140, 255]);
  });

  it("creates stable normalized edge fields and thresholds tone composition", () => {
    const luminance: ToneField = { width: 3, height: 3, values: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]) };
    const details = sobelEdgeDetails(luminance);
    const combined = combineToneAndEdges(luminance, details.edge, false, "hybrid", 0.5);

    expect(Array.from(details.edge.values).every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(Array.from(combined.values).every((value) => value === 0 || value === 1)).toBe(true);
  });
});
