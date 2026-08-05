export const CHARACTER_SETS = {
  ascii: " .:-=+*#%@",
  braille: "⣀⣄⣤⣦⣶⣷⣿",
  blocks: " ░▒▓█",
  unicode: " ▁▂▃▄▅▆▇█▓▒░⢀⢂⢄⢅⢆⢇⢸⣀⣄⣆⣇⣈⣊⣌⣎⣐⣒⣔⣖⣘⣚⣜⣞⣠⣤⣦⣧⣨⣪⣬⣮⣰⣲⣴⣶⣸⣺⣼⣿",
  unicodeFine: " .`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
} as const;

export type CharacterSetId = keyof typeof CHARACTER_SETS | "custom";

export type ColorMode = "colour" | "monochrome";

export type ResolutionKey = "low" | "medium" | "high" | "ultra" | "packed";

export const RESOLUTION_PRESETS: Record<ResolutionKey, { columns: number; label: string }> = {
  low: { columns: 56, label: "Low" },
  medium: { columns: 84, label: "Medium" },
  high: { columns: 120, label: "High" },
  ultra: { columns: 164, label: "Ultra" },
  packed: { columns: 240, label: "Packed" },
};

export const PALETTES = [
  { id: "bw", name: "Black & White", foreground: "#e8edf2", background: "#070b14", accent: "#a9b4c2" },
  { id: "terminal", name: "Green Terminal", foreground: "#c8ffbf", background: "#041108", accent: "#76ff94" },
  { id: "amber", name: "Amber CRT", foreground: "#ffd7a0", background: "#100a02", accent: "#ffb84d" },
  { id: "blue", name: "Blue", foreground: "#d9ebff", background: "#06111d", accent: "#5ab1ff" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export type ArtOptions = {
  columns: number;
  characterSet: CharacterSetId;
  customText: string;
  invert: boolean;
  palette: PaletteId;
  colorMode: ColorMode;
  packed: boolean;
};

export type GeneratedArt = {
  lines: string[];
  colors: string[][];
  columns: number;
  rows: number;
  foreground: string;
  background: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const sanitizeCustomCharacters = (value: string) => {
  const characters = Array.from(new Set(Array.from(value.replace(/\s+/g, ""))));
  return characters.join("");
};

export const getCharactersForSet = (characterSet: CharacterSetId, customText: string) => {
  if (characterSet === "custom") {
    const sanitized = sanitizeCustomCharacters(customText);
    return sanitized.length > 0 ? sanitized : CHARACTER_SETS.ascii;
  }

  return CHARACTER_SETS[characterSet];
};

const getPalette = (palette: PaletteId) => PALETTES.find((option) => option.id === palette) ?? PALETTES[0];

const toHexColor = (red: number, green: number, blue: number) => {
  const componentToHex = (component: number) => Math.round(clamp(component, 0, 255)).toString(16).padStart(2, "0");

  return `#${componentToHex(red)}${componentToHex(green)}${componentToHex(blue)}`;
};

const luminanceFromRgb = (red: number, green: number, blue: number) => (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;

const getOrderedCharacters = (characters: string) => {
  const sequence = Array.from(characters);

  return sequence.length > 0 ? sequence : Array.from(CHARACTER_SETS.ascii);
};

const remapTone = (tone: number) => {
  const lifted = Math.pow(clamp(tone, 0, 1), 0.85);
  return clamp(0.5 + (lifted - 0.5) * 1.15, 0, 1);
};

const getGlyphForTone = (tone: number, characters: string[]) => {
  if (characters.length === 0) {
    return " ";
  }

  const adjustedTone = remapTone(tone);
  const index = Math.round(adjustedTone * (characters.length - 1));
  return characters[index] ?? characters[characters.length - 1] ?? " ";
};

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const generateArtFromCanvas = (sourceCanvas: HTMLCanvasElement, options: ArtOptions): GeneratedArt => {
  const palette = getPalette(options.palette);
  const characters = getOrderedCharacters(getCharactersForSet(options.characterSet, options.customText));
  const { width, height } = sourceCanvas;
  const columns = clamp(options.columns, 24, 240);
  const rowHeightRatio = options.packed ? 0.38 : 0.55;
  const rows = Math.max(1, Math.round((height / width) * columns * rowHeightRatio));
  const sampleCanvas = createCanvas(columns, rows);
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });

  if (!sampleContext) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  sampleContext.imageSmoothingEnabled = true;
  sampleContext.clearRect(0, 0, columns, rows);
  sampleContext.drawImage(sourceCanvas, 0, 0, columns, rows);

  const sampled = sampleContext.getImageData(0, 0, columns, rows).data;
  const lines: string[] = [];
  const colors: string[][] = [];

  for (let row = 0; row < rows; row += 1) {
    let line = "";
    const rowColors: string[] = [];

    for (let column = 0; column < columns; column += 1) {
      const index = (row * columns + column) * 4;
      const red = sampled[index] ?? 0;
      const green = sampled[index + 1] ?? 0;
      const blue = sampled[index + 2] ?? 0;

      const tone = options.invert ? luminanceFromRgb(red, green, blue) : 1 - luminanceFromRgb(red, green, blue);
      line += getGlyphForTone(tone, characters);
      rowColors.push(options.colorMode === "colour" ? toHexColor(red, green, blue) : palette.foreground);
    }

    lines.push(line);
    colors.push(rowColors);
  }

  return {
    lines,
    colors,
    columns,
    rows,
    foreground: palette.foreground,
    background: palette.background,
  };
};

export async function generateArtFromImage(
  image: HTMLImageElement,
  options: ArtOptions,
): Promise<GeneratedArt> {
  const sourceCanvas = createCanvas(image.naturalWidth, image.naturalHeight);
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;

  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  sourceContext.drawImage(image, 0, 0);
  return generateArtFromCanvas(sourceCanvas, options);
};
