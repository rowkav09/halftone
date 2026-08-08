import { hexToRgb, interpolateRgb, safeColour, squaredDistance, type Rgb, rgbToHex } from "@/lib/colour";
import type { ColorCount } from "@/lib/art";

export type ColourTreatment =
  | { kind: "source" }
  | { kind: "monochrome"; colour: string }
  | { kind: "palette"; count: ColorCount }
  | { kind: "duotone"; shadowColour: string; highlightColour: string }
  | { kind: "gradient-map"; stops: string[] };

type ResolvedColour = { rgb: Rgb; hex: string };

const closestPaletteColour = (source: Rgb, colours: ResolvedColour[]) => {
  if (!colours.length) return rgbToHex(source[0], source[1], source[2]);
  return colours.reduce((closest, candidate) =>
    squaredDistance(source, candidate.rgb) < squaredDistance(source, closest.rgb) ? candidate : closest,
  ).hex;
};

const gradientMapColour = (stops: Rgb[], luminance: number) => {
  if (stops.length < 2) return stops[0] ? rgbToHex(...stops[0]) : "#ffffff";
  const position = Math.min(1, Math.max(0, luminance)) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  return interpolateRgb(stops[index]!, stops[index + 1]!, position - index);
};

export const createColourTreatmentResolver = (treatment: ColourTreatment, paletteColours: Rgb[] = []) => {
  switch (treatment.kind) {
    case "source":
      return (source: Rgb, _luminance: number, readableSource: string) => readableSource;
    case "monochrome": {
      const colour = safeColour(treatment.colour);
      return (_source: Rgb, _luminance: number, _readableSource: string) => colour;
    }
    case "palette": {
      const colours = paletteColours.map((colour) => ({ rgb: colour, hex: rgbToHex(...colour) }));
      return (source: Rgb, _luminance: number, _readableSource: string) => closestPaletteColour(source, colours);
    }
    case "duotone": {
      const shadow = hexToRgb(safeColour(treatment.shadowColour));
      const highlight = hexToRgb(safeColour(treatment.highlightColour));
      return (_source: Rgb, luminance: number, _readableSource: string) => interpolateRgb(shadow, highlight, luminance);
    }
    case "gradient-map": {
      const stops = treatment.stops.slice(0, 4).map((stop) => hexToRgb(safeColour(stop)));
      return (_source: Rgb, luminance: number, _readableSource: string) => gradientMapColour(stops, luminance);
    }
  }
};
