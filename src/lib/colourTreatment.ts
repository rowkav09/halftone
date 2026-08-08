import { interpolateColour, safeColour, squaredDistance, type Rgb, rgbToHex } from "@/lib/colour";
import type { ColorCount } from "@/lib/art";

export type ColourTreatment =
  | { kind: "source" }
  | { kind: "monochrome"; colour: string }
  | { kind: "palette"; count: ColorCount }
  | { kind: "duotone"; shadowColour: string; highlightColour: string }
  | { kind: "gradient-map"; stops: string[] };

const closestPaletteColour = (source: Rgb, colours: Rgb[]) => {
  if (!colours.length) return rgbToHex(source[0], source[1], source[2]);
  return rgbToHex(...colours.reduce((closest, candidate) =>
    squaredDistance(source, candidate) < squaredDistance(source, closest) ? candidate : closest,
  ));
};

const gradientMapColour = (stops: string[], luminance: number) => {
  const safeStops = stops.slice(0, 4).map((stop) => safeColour(stop));
  if (safeStops.length < 2) return safeStops[0] ?? "#ffffff";
  const position = Math.min(1, Math.max(0, luminance)) * (safeStops.length - 1);
  const index = Math.min(safeStops.length - 2, Math.floor(position));
  return interpolateColour(safeStops[index]!, safeStops[index + 1]!, position - index);
};

export const createColourTreatmentResolver = (treatment: ColourTreatment, paletteColours: Rgb[] = []) => {
  switch (treatment.kind) {
    case "source":
      return (source: Rgb, _luminance: number, readableSource: string) => readableSource;
    case "monochrome": {
      const colour = safeColour(treatment.colour);
      return (_source: Rgb, _luminance: number, _readableSource: string) => colour;
    }
    case "palette":
      return (source: Rgb, _luminance: number, _readableSource: string) => closestPaletteColour(source, paletteColours);
    case "duotone": {
      const shadow = safeColour(treatment.shadowColour);
      const highlight = safeColour(treatment.highlightColour);
      return (_source: Rgb, luminance: number, _readableSource: string) => interpolateColour(shadow, highlight, luminance);
    }
    case "gradient-map":
      return (_source: Rgb, luminance: number, _readableSource: string) => gradientMapColour(treatment.stops, luminance);
  }
};
