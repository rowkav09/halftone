import { describe, expect, it } from "vitest";
import { applyToneCurve, toneCurveValue } from "@/lib/renderer/tone";

describe("tone curve", () => {
  it("preserves endpoints and stays monotonic and in range", () => {
    const values = new Float32Array([0, 0.1, 0.25, 0.5, 0.75, 1]);
    const field = applyToneCurve({ values, width: values.length, height: 1 });
    expect(field.values[0]).toBe(0);
    expect(field.values.at(-1)).toBe(1);
    expect(Array.from(field.values).every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(Array.from(field.values).every((value, index) => index === 0 || value >= field.values[index - 1]!)).toBe(true);
    expect(toneCurveValue(0.25)).toBeCloseTo(field.values[2]!, 6);
  });
});
