export const CHARACTER_SETS = {
  ascii: " .:-=+*#%@",
  braille: "⣀⣄⣤⣦⣶⣷⣿",
  blocks: " ░▒▓█",
  unicode: " ▁▂▃▄▅▆▇█▓▒░⢀⢂⢄⢅⢆⢇⢸⣀⣄⣆⣇⣈⣊⣌⣎⣐⣒⣔⣖⣘⣚⣜⣞⣠⣤⣦⣧⣨⣪⣬⣮⣰⣲⣴⣶⣸⣺⣼⣿",
  unicodeFine: " .`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
} as const;

export type CharacterSetId = keyof typeof CHARACTER_SETS | "custom";

export type ColorMode = "original" | "palette";

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

export type TextArtStyle = {
  fontWeight: number;
  italic: boolean;
  scaleX: number;
  skew: number;
  outline: number;
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

const generateArtFromCanvas = (sourceCanvas: HTMLCanvasElement, options: ArtOptions): GeneratedArt => {
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
      rowColors.push(options.colorMode === "original" ? toHexColor(red, green, blue) : palette.foreground);
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
}

const normalizeBannerText = (value: string) => value.replace(/\s+/g, " ").trim().toUpperCase() || "HALFTONE";

const fitBannerText = (
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  scaleX: number,
) => {
  const words = normalizeBannerText(text).split(" ");
  let fontSize = Math.floor(height * 0.72);
  let lines = [normalizeBannerText(text)];

  while (fontSize >= 20) {
    context.font = `${fontSize}px var(--font-sans), sans-serif`;
    const lineGap = Math.max(6, Math.round(fontSize * 0.15));
    const limit = width * 0.86 / scaleX;

    const wrapped: string[] = [];
    if (words.length > 1) {
      let currentLine = "";

      for (const word of words) {
        const candidate = currentLine.length > 0 ? `${currentLine} ${word}` : word;
        if (context.measureText(candidate).width <= limit) {
          currentLine = candidate;
        } else {
          if (currentLine.length > 0) {
            wrapped.push(currentLine);
          }
          currentLine = word;
        }
      }

      if (currentLine.length > 0) {
        wrapped.push(currentLine);
      }
    } else {
      wrapped.push(words[0] ?? "HALFTONE");
    }

    const widest = wrapped.reduce((maxWidth, line) => Math.max(maxWidth, context.measureText(line).width), 0) * scaleX;
    const totalHeight = wrapped.length * fontSize + Math.max(0, wrapped.length - 1) * lineGap;

    if (widest <= width * 0.86 && totalHeight <= height * 0.72) {
      lines = wrapped;
      break;
    }

    fontSize -= 2;
  }

  return { fontSize, lines };
};

export async function generateArtFromText(
  text: string,
  options: ArtOptions,
  style: TextArtStyle,
): Promise<GeneratedArt> {
  const sourceWidth = clamp(Math.round(options.columns * 15), 960, 2400);
  const sourceHeight = Math.round(sourceWidth / 4.25);
  const sourceCanvas = createCanvas(sourceWidth, sourceHeight);
  const context = sourceCanvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  context.fillStyle = "#f4f8ff";
  context.fillRect(0, 0, sourceWidth, sourceHeight);
  context.fillStyle = "#050810";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";

  const { fontSize, lines } = fitBannerText(context, text, sourceWidth, sourceHeight, style.scaleX);
  const lineGap = Math.max(6, Math.round(fontSize * 0.15));
  const totalHeight = lines.length * fontSize + Math.max(0, lines.length - 1) * lineGap;
  const startY = sourceHeight / 2 - totalHeight / 2 + fontSize / 2;

  context.save();
  context.translate(sourceWidth / 2, sourceHeight / 2);
  context.transform(style.scaleX, 0, Math.tan((style.skew * Math.PI) / 180), 1, 0, 0);
  context.translate(-sourceWidth / 2, -sourceHeight / 2);
  context.font = `${style.italic ? "italic " : ""}${style.fontWeight} ${fontSize}px var(--font-sans), sans-serif`;

  lines.forEach((line, index) => {
    const y = startY + index * (fontSize + lineGap);
    if (style.outline > 0) {
      context.strokeStyle = "rgba(7, 11, 20, 0.95)";
      context.lineWidth = style.outline;
      context.strokeText(line, sourceWidth / 2, y);
    }

    context.fillText(line, sourceWidth / 2, y);
  });

  context.restore();

  return generateArtFromCanvas(sourceCanvas, options);
}