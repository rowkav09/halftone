import type { ToneField } from "@/lib/renderer/types";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** Matches the renderer's historical perceptual glyph response. */
export const toneCurveValue = (value: number, exponent = 0.72) => Math.pow(clamp(value), exponent);

export const applyToneCurve = (field: ToneField, exponent = 0.72): ToneField => {
  const values = new Float32Array(field.values.length);
  for (let index = 0; index < values.length; index += 1) {
    values[index] = toneCurveValue(field.values[index] ?? 0, exponent);
  }
  return { values, width: field.width, height: field.height };
};
