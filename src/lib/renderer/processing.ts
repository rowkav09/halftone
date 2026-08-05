import type { ImageAdjustments, ToneField } from "@/lib/renderer/types";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const luminanceFromRgb = (red: number, green: number, blue: number) => (
  red * 0.2126 + green * 0.7152 + blue * 0.0722
) / 255;

const blurField = (source: Float32Array, width: number, height: number, radius: number) => {
  if (radius <= 0) return source;
  const output = new Float32Array(source.length);
  const kernel = Math.max(1, Math.round(radius));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let total = 0;
      let count = 0;
      for (let offsetY = -kernel; offsetY <= kernel; offsetY += 1) {
        const sampleY = Math.min(height - 1, Math.max(0, y + offsetY));
        for (let offsetX = -kernel; offsetX <= kernel; offsetX += 1) {
          const sampleX = Math.min(width - 1, Math.max(0, x + offsetX));
          total += source[sampleY * width + sampleX] ?? 0;
          count += 1;
        }
      }
      output[y * width + x] = total / count;
    }
  }

  return output;
};

const adjustChannel = (channel: number, brightness: number, contrast: number, gamma: number) => {
  const brightened = clamp(channel + brightness / 100);
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const contrasted = clamp(contrastFactor * (brightened - 0.5) + 0.5);
  return Math.pow(contrasted, 1 / Math.max(0.1, gamma));
};

/**
 * Applies colour adjustments to a small sampled image. Work at glyph resolution so
 * the controls stay fast even when the original upload is very large.
 */
export const adjustImageData = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  adjustments: ImageAdjustments,
) => {
  const adjusted = new Uint8ClampedArray(source.length);
  const luminance = new Float32Array(width * height);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    let red = adjustChannel((source[offset] ?? 0) / 255, adjustments.brightness, adjustments.contrast, adjustments.gamma);
    let green = adjustChannel((source[offset + 1] ?? 0) / 255, adjustments.brightness, adjustments.contrast, adjustments.gamma);
    let blue = adjustChannel((source[offset + 2] ?? 0) / 255, adjustments.brightness, adjustments.contrast, adjustments.gamma);
    const gray = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const saturation = Math.max(0, adjustments.saturation);
    red = clamp(gray + (red - gray) * saturation);
    green = clamp(gray + (green - gray) * saturation);
    blue = clamp(gray + (blue - gray) * saturation);

    adjusted[offset] = Math.round(red * 255);
    adjusted[offset + 1] = Math.round(green * 255);
    adjusted[offset + 2] = Math.round(blue * 255);
    adjusted[offset + 3] = source[offset + 3] ?? 255;
    luminance[index] = luminanceFromRgb(adjusted[offset], adjusted[offset + 1], adjusted[offset + 2]);
  }

  const blurred = blurField(luminance, width, height, adjustments.blur);
  const sharpenBase = adjustments.sharpness > 0 ? blurField(blurred, width, height, 1) : blurred;
  const tone = new Float32Array(luminance.length);
  const sharpness = adjustments.sharpness / 100;
  for (let index = 0; index < tone.length; index += 1) {
    tone[index] = clamp(blurred[index] + (blurred[index] - sharpenBase[index]) * sharpness * 2);
  }

  return { data: adjusted, luminance: tone };
};

export const sobelEdges = (field: ToneField): ToneField => {
  const output = new Float32Array(field.values.length);
  let strongest = 0;
  const get = (x: number, y: number) => field.values[Math.min(field.height - 1, Math.max(0, y)) * field.width + Math.min(field.width - 1, Math.max(0, x))] ?? 0;

  for (let y = 0; y < field.height; y += 1) {
    for (let x = 0; x < field.width; x += 1) {
      const horizontal = -get(x - 1, y - 1) + get(x + 1, y - 1) - 2 * get(x - 1, y) + 2 * get(x + 1, y) - get(x - 1, y + 1) + get(x + 1, y + 1);
      const vertical = -get(x - 1, y - 1) - 2 * get(x, y - 1) - get(x + 1, y - 1) + get(x - 1, y + 1) + 2 * get(x, y + 1) + get(x + 1, y + 1);
      const magnitude = Math.hypot(horizontal, vertical);
      output[y * field.width + x] = magnitude;
      strongest = Math.max(strongest, magnitude);
    }
  }

  if (strongest > 0) output.forEach((value, index) => { output[index] = clamp(value / strongest); });
  return { values: output, width: field.width, height: field.height };
};

export const combineToneAndEdges = (luminance: ToneField, edge: ToneField, invert: boolean, mode: "density" | "edge" | "hybrid", threshold: number): ToneField => {
  const values = new Float32Array(luminance.values.length);
  for (let index = 0; index < values.length; index += 1) {
    const density = invert ? luminance.values[index] ?? 0 : 1 - (luminance.values[index] ?? 0);
    const edgeValue = edge.values[index] ?? 0;
    const mixed = mode === "edge" ? edgeValue : mode === "hybrid" ? Math.max(density * 0.78, edgeValue * 1.15) : density;
    values[index] = threshold > 0 ? mixed >= threshold ? 1 : 0 : clamp(mixed);
  }
  return { values, width: luminance.width, height: luminance.height };
};
