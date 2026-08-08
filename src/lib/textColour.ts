import type { GeneratedArt } from "@/lib/art";
import { interpolateColour, rgbToHex, safeColour } from "@/lib/colour";

export const FIGLET_COLOUR_STYLES = [
  { id: "monochrome", name: "Monochrome" },
  { id: "solid", name: "Solid colour" },
  { id: "horizontal", name: "Horizontal gradient" },
  { id: "vertical", name: "Vertical gradient" },
  { id: "rainbow", name: "Rainbow gradient" },
  { id: "terminal", name: "Terminal green" },
  { id: "amber", name: "Amber CRT" },
  { id: "custom", name: "Custom two-colour gradient" },
] as const;

export type FigletColourStyle = (typeof FIGLET_COLOUR_STYLES)[number]["id"];

export type FigletColourSettings = {
  style: FigletColourStyle;
  solid: string;
  gradientStart: string;
  gradientEnd: string;
  customStart: string;
  customEnd: string;
  includeBackground: boolean;
  background: string;
  lineHeight: number;
};

export const DEFAULT_FIGLET_COLOUR_SETTINGS: FigletColourSettings = {
  style: "monochrome",
  solid: "#67e8f9",
  gradientStart: "#67e8f9",
  gradientEnd: "#a78bfa",
  customStart: "#ff5f56",
  customEnd: "#ffbd2e",
  includeBackground: true,
  background: "#000000",
  lineHeight: 1,
};

const FALLBACK_COLOUR = "#e8edf2";

const rainbow = (progress: number) => {
  const hue = ((progress % 1) + 1) % 1 * 360;
  const chroma = 0.78;
  const lightness = 0.66;
  const sector = hue / 60;
  const secondary = chroma * (1 - Math.abs(sector % 2 - 1));
  const [red, green, blue] = sector < 1 ? [chroma, secondary, 0] : sector < 2 ? [secondary, chroma, 0] : sector < 3 ? [0, chroma, secondary] : sector < 4 ? [0, secondary, chroma] : sector < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
  const match = lightness - chroma / 2;
  return rgbToHex((red + match) * 255, (green + match) * 255, (blue + match) * 255);
};

export const getFigletBackground = (settings: FigletColourSettings) => {
  if (!settings.includeBackground) return undefined;
  if (settings.style === "terminal") return "#041108";
  if (settings.style === "amber") return "#100a02";
  return safeColour(settings.background, "#000000");
};

/** Applies a display-only colour map; FIGlet lines and their whitespace are untouched. */
export const applyFigletColours = (art: GeneratedArt, settings: FigletColourSettings): GeneratedArt => {
  const maximumColumns = Math.max(1, ...art.lines.map((line) => Array.from(line).length));
  const maximumRows = Math.max(1, art.lines.length);
  const toneFor = (column: number, row: number) => {
    const horizontal = maximumColumns <= 1 ? 0 : column / (maximumColumns - 1);
    const vertical = maximumRows <= 1 ? 0 : row / (maximumRows - 1);
    switch (settings.style) {
      case "solid": return safeColour(settings.solid);
      case "horizontal": return interpolateColour(settings.gradientStart, settings.gradientEnd, horizontal);
      case "vertical": return interpolateColour(settings.gradientStart, settings.gradientEnd, vertical);
      case "rainbow": return rainbow(horizontal * 0.9);
      case "terminal": return "#c8ffbf";
      case "amber": return "#ffd7a0";
      case "custom": return interpolateColour(settings.customStart, settings.customEnd, horizontal);
      default: return FALLBACK_COLOUR;
    }
  };

  const colors = art.lines.map((line, row) => Array.from(line, (_, column) => toneFor(column, row)));
  const foreground = colors[0]?.[0] ?? FALLBACK_COLOUR;
  const background = getFigletBackground(settings);
  return background ? { ...art, colors, foreground, background: { kind: "solid", colour: background }, backgroundColour: background } : { ...art, colors, foreground };
};
