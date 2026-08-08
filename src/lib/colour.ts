export type Rgb = readonly [number, number, number];

const HEX_COLOUR = /^#[\da-f]{6}$/iu;

export const squaredDistance = (first: Rgb, second: Rgb) => {
  const red = first[0] - second[0];
  const green = first[1] - second[1];
  const blue = first[2] - second[2];
  return red * red + green * green + blue * blue;
};

export const isHexColour = (value: string | undefined): value is string => Boolean(value && HEX_COLOUR.test(value));

export const safeColour = (value: string | undefined, fallback = "#e8edf2") => isHexColour(value) ? value : fallback;

export const hexToRgb = (value: string, fallback = "#e8edf2"): Rgb => {
  const safe = safeColour(value, fallback);
  return [
    Number.parseInt(safe.slice(1, 3), 16),
    Number.parseInt(safe.slice(3, 5), 16),
    Number.parseInt(safe.slice(5, 7), 16),
  ];
};

export const rgbToHex = (red: number, green: number, blue: number) => {
  const component = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0");
  return `#${component(red)}${component(green)}${component(blue)}`;
};

export const interpolateColour = (start: string, end: string, progress: number) => {
  const from = hexToRgb(start);
  const to = hexToRgb(end);
  const amount = Math.min(1, Math.max(0, progress));
  return rgbToHex(
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  );
};
