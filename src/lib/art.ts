export const CHARACTER_SETS = {
  ascii: " .:-=+*#%@",
  braille: "⣀⣄⣤⣦⣶⣷⣿",
  blocks: " ░▒▓█",
  binary: "01",
  matrix: " ｱｲｳｴｵ0123",
  symbols: " .`'-,^:;!<>/\\|[]{}()",
  unicode: " ▁▂▃▄▅▆▇█",
  unicodeFine: " .`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
} as const;

export type CharacterSetId = keyof typeof CHARACTER_SETS | "custom";

export type ColorMode = "colour" | "monochrome";

export const COLOR_COUNTS = [0, 2, 4, 8, 16] as const;
export type ColorCount = (typeof COLOR_COUNTS)[number];

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
  colorCount: ColorCount;
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

const toReadableColor = (red: number, green: number, blue: number, tone: number) => {
  const lift = 0.22 + 0.58 * clamp(tone, 0, 1);
  return toHexColor(
    red + (235 - red) * lift,
    green + (242 - green) * lift,
    blue + (255 - blue) * lift,
  );
};

type Rgb = readonly [number, number, number];

const squaredDistance = (first: Rgb, second: Rgb) => {
  const red = first[0] - second[0];
  const green = first[1] - second[1];
  const blue = first[2] - second[2];
  return red * red + green * green + blue * blue;
};

const getImagePalette = (sampled: Uint8ClampedArray, colorCount: ColorCount): Rgb[] | null => {
  if (colorCount === 0) return null;

  const samples: Rgb[] = [];
  const cellCount = sampled.length / 4;
  const sampleStride = Math.max(1, Math.floor(cellCount / 2400));
  for (let cell = 0; cell < cellCount; cell += sampleStride) {
    const index = cell * 4;
    samples.push([sampled[index] ?? 0, sampled[index + 1] ?? 0, sampled[index + 2] ?? 0]);
  }
  if (!samples.length) return null;

  const centers: Rgb[] = [samples[0] ?? [0, 0, 0]];
  while (centers.length < colorCount) {
    let candidate = samples[0] ?? [0, 0, 0];
    let greatestDistance = -1;
    for (const sample of samples) {
      const nearest = Math.min(...centers.map((center) => squaredDistance(sample, center)));
      if (nearest > greatestDistance) {
        greatestDistance = nearest;
        candidate = sample;
      }
    }
    centers.push(candidate);
  }

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const totals = centers.map(() => [0, 0, 0, 0]);
    for (const sample of samples) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      centers.forEach((center, index) => {
        const distance = squaredDistance(sample, center);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      const total = totals[nearestIndex];
      if (total) {
        total[0] += sample[0];
        total[1] += sample[1];
        total[2] += sample[2];
        total[3] += 1;
      }
    }
    centers.forEach((center, index) => {
      const total = totals[index];
      if (total && total[3] > 0) centers[index] = [total[0] / total[3], total[1] / total[3], total[2] / total[3]];
      else centers[index] = center;
    });
  }

  return centers;
};

const getClosestPaletteColor = (red: number, green: number, blue: number, palette: Rgb[] | null): Rgb => {
  if (!palette?.length) return [red, green, blue];
  const color: Rgb = [red, green, blue];
  return palette.reduce((closest, candidate) => squaredDistance(color, candidate) < squaredDistance(color, closest) ? candidate : closest);
};

const getOrderedCharacters = (characters: string) => {
  const sequence = Array.from(characters);

  return sequence.length > 0 ? sequence : Array.from(CHARACTER_SETS.ascii);
};

// Preserve shaded detail without filling a truly black background with noise.
const remapTone = (tone: number) => Math.pow(clamp(tone, 0, 1), 0.68);

const bayer4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const getDitherThreshold = (column: number, row: number) => ((bayer4[row % 4]?.[column % 4] ?? 8) + 0.5) / 16;

const getGlyphHash = (column: number, row: number) => Math.abs((column * 17 + row * 31 + column * row * 7) % 997);

const getGlyphForTone = (
  tone: number,
  characters: string[],
  characterSet: CharacterSetId,
  column: number,
  row: number,
) => {
  if (characters.length === 0) {
    return " ";
  }

  if (characterSet === "binary") {
    // Ordered dithering preserves subtle edges despite 0/1 having equal visual weight.
    const threshold = (bayer4[row % 4]?.[column % 4] ?? 8) / 16;
    return tone > threshold ? "1" : "0";
  }

  if (characterSet === "unicode") {
    // Horizontal blocks have a consistent visual-density ramp; mixing unrelated Braille cells made edges noisy.
    const index = Math.round(remapTone(tone) * (characters.length - 1));
    return characters[index] ?? characters[characters.length - 1] ?? " ";
  }

  if (characterSet === "matrix") {
    // Dithered coverage preserves the image; kana/digit selection only adds the Matrix texture.
    if (remapTone(tone) < getDitherThreshold(column, row)) return " ";
    const glyphs = characters.slice(1);
    return glyphs[getGlyphHash(column, row) % glyphs.length] ?? " ";
  }

  if (characterSet === "symbols") {
    // Punctuation has no natural density order, so coverage and glyph choice are handled separately.
    if (remapTone(tone) < getDitherThreshold(column, row)) return " ";
    const light = [".", "`", "'", ",", "-"];
    const middle = [":", ";", "!", "<", ">", "/", "\\", "|"];
    const heavy = ["[", "]", "{", "}", "(", ")"];
    const tier = tone < 0.38 ? light : tone < 0.72 ? middle : heavy;
    return tier[getGlyphHash(column, row) % tier.length] ?? " ";
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
  const rowHeightRatio = 0.55;
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
  const imagePalette = options.colorMode === "colour" ? getImagePalette(sampled, options.colorCount) : null;
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
      const [displayRed, displayGreen, displayBlue] = getClosestPaletteColor(red, green, blue, imagePalette);

      const luminance = luminanceFromRgb(red, green, blue);
      const tone = options.invert ? luminance : 1 - luminance;
      line += getGlyphForTone(tone, characters, options.characterSet, column, row);
      rowColors.push(options.colorMode === "colour" ? toReadableColor(displayRed, displayGreen, displayBlue, tone) : palette.foreground);
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
