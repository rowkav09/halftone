import { describe, expect, it } from "vitest";
import { CHARACTER_SETS, COLOR_COUNTS, PALETTES } from "@/lib/art";
import { DITHER_ALGORITHMS, RENDER_MODES } from "@/lib/renderer/types";
import { IMAGE_PRESETS, isValidImagePreset } from "@/lib/imagePresets";

describe("image presets", () => {
  it("contains complete, valid option bundles", () => {
    expect(IMAGE_PRESETS.length).toBeGreaterThanOrEqual(6);
    expect(IMAGE_PRESETS.length).toBeLessThanOrEqual(8);
    expect(new Set(IMAGE_PRESETS.map((preset) => preset.id)).size).toBe(IMAGE_PRESETS.length);
    for (const preset of IMAGE_PRESETS) {
      expect(isValidImagePreset(preset)).toBe(true);
      expect(preset.characterSet === "custom" || preset.characterSet in CHARACTER_SETS).toBe(true);
      expect(DITHER_ALGORITHMS).toContain(preset.dither);
      expect(RENDER_MODES).toContain(preset.renderMode);
      expect(PALETTES.map((palette) => palette.id)).toContain(preset.palette);
      expect(COLOR_COUNTS).toContain(preset.colorCount);
      expect(preset.adjustments).toEqual(expect.objectContaining({
        brightness: expect.any(Number),
        contrast: expect.any(Number),
        toneLevels: expect.any(Number),
        grain: expect.any(Number),
        grainSeed: expect.any(Number),
      }));
      expect(preset.adjustments.brightness).toBeGreaterThanOrEqual(-100);
      expect(preset.adjustments.brightness).toBeLessThanOrEqual(100);
      expect(preset.adjustments.contrast).toBeGreaterThanOrEqual(-100);
      expect(preset.adjustments.contrast).toBeLessThanOrEqual(100);
      expect(preset.adjustments.gamma).toBeGreaterThanOrEqual(0.4);
      expect(preset.adjustments.gamma).toBeLessThanOrEqual(2.5);
      expect(preset.adjustments.saturation).toBeGreaterThanOrEqual(0);
      expect(preset.adjustments.saturation).toBeLessThanOrEqual(2);
      expect(preset.adjustments.threshold).toBeGreaterThanOrEqual(0);
      expect(preset.adjustments.threshold).toBeLessThanOrEqual(0.95);
      expect(preset.adjustments.ditherStrength).toBeGreaterThanOrEqual(0);
      expect(preset.adjustments.ditherStrength).toBeLessThanOrEqual(1);
      expect(preset.adjustments.preBlur).toBeGreaterThanOrEqual(0);
      expect(preset.adjustments.preBlur).toBeLessThanOrEqual(0.75);
      expect(preset.adjustments.sharpness).toBeGreaterThanOrEqual(0);
      expect(preset.adjustments.sharpness).toBeLessThanOrEqual(100);
      expect(preset.adjustments.blur).toBeGreaterThanOrEqual(0);
      expect(preset.adjustments.blur).toBeLessThanOrEqual(4);
      expect(Number.isInteger(preset.adjustments.grainSeed)).toBe(true);
      expect(preset.background).toHaveProperty("kind");
      expect(preset.colourTreatment).toHaveProperty("kind");
    }
  });
});
