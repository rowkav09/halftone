import { interpolateColour, isHexColour, safeColour } from "@/lib/colour";

export type Background =
  | { kind: "solid"; colour: string }
  | { kind: "linear"; startColour: string; endColour: string; angle: number }
  | { kind: "radial"; innerColour: string; outerColour: string; centerX: number; centerY: number; spread: number }
  | { kind: "transparent" };

export const solidBackground = (colour: string): Background => ({ kind: "solid", colour: safeColour(colour, "#000000") });
export const transparentBackground = (): Background => ({ kind: "transparent" });

export const backgroundRepresentativeColour = (background: Background, fallback = "#000000") => {
  switch (background.kind) {
    case "solid": return safeColour(background.colour, fallback);
    case "linear": return interpolateColour(background.startColour, background.endColour, 0.5);
    case "radial": return safeColour(background.outerColour, fallback);
    case "transparent": return fallback;
  }
};

const normaliseAngle = (angle: number) => ((angle % 360) + 360) % 360;
const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

// Angles are clockwise from left to right in canvas coordinates (0° = horizontal, 90° = top to bottom).
export const linearGradientEndpoints = (width: number, height: number, angle: number) => {
  const radians = normaliseAngle(angle) * Math.PI / 180;
  const directionX = Math.cos(radians);
  const directionY = Math.sin(radians);
  const centerX = width / 2;
  const centerY = height / 2;
  const extent = Math.abs(directionX) * width / 2 + Math.abs(directionY) * height / 2;
  return {
    startX: centerX - directionX * extent,
    startY: centerY - directionY * extent,
    endX: centerX + directionX * extent,
    endY: centerY + directionY * extent,
  };
};

const radialRadius = (width: number, height: number, background: Extract<Background, { kind: "radial" }>) => {
  const centerX = clampUnit(background.centerX) * width;
  const centerY = clampUnit(background.centerY) * height;
  const corners = [[0, 0], [width, 0], [0, height], [width, height]];
  return Math.max(...corners.map(([x, y]) => Math.hypot(x - centerX, y - centerY))) * Math.max(0.01, background.spread);
};

export const paintBackground = (context: CanvasRenderingContext2D, width: number, height: number, background: Background) => {
  context.clearRect(0, 0, width, height);
  if (background.kind === "transparent") return;
  if (background.kind === "solid") {
    context.fillStyle = safeColour(background.colour, "#000000");
    context.fillRect(0, 0, width, height);
    return;
  }
  if (background.kind === "linear") {
    const endpoints = linearGradientEndpoints(width, height, background.angle);
    const gradient = context.createLinearGradient(endpoints.startX, endpoints.startY, endpoints.endX, endpoints.endY);
    gradient.addColorStop(0, safeColour(background.startColour));
    gradient.addColorStop(1, safeColour(background.endColour));
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    return;
  }
  const centerX = clampUnit(background.centerX) * width;
  const centerY = clampUnit(background.centerY) * height;
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radialRadius(width, height, background));
  gradient.addColorStop(0, safeColour(background.innerColour));
  gradient.addColorStop(1, safeColour(background.outerColour));
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
};

export const svgBackground = (background: Background, width: number, height: number) => {
  if (background.kind === "transparent") return { defs: "", rect: "" };
  if (background.kind === "solid") return { defs: "", rect: `<rect width="100%" height="100%" fill="${safeColour(background.colour, "#000000")}"/>` };
  if (background.kind === "linear") {
    const endpoints = linearGradientEndpoints(width, height, background.angle);
    const id = "art-linear-background";
    const defs = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${endpoints.startX}" y1="${endpoints.startY}" x2="${endpoints.endX}" y2="${endpoints.endY}"><stop offset="0%" stop-color="${safeColour(background.startColour)}"/><stop offset="100%" stop-color="${safeColour(background.endColour)}"/></linearGradient>`;
    return { defs: `<defs>${defs}</defs>`, rect: `<rect width="100%" height="100%" fill="url(#${id})"/>` };
  }
  const id = "art-radial-background";
  const centerX = clampUnit(background.centerX) * width;
  const centerY = clampUnit(background.centerY) * height;
  const defs = `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${centerX}" cy="${centerY}" r="${radialRadius(width, height, background)}"><stop offset="0%" stop-color="${safeColour(background.innerColour)}"/><stop offset="100%" stop-color="${safeColour(background.outerColour)}"/></radialGradient>`;
  return { defs: `<defs>${defs}</defs>`, rect: `<rect width="100%" height="100%" fill="url(#${id})"/>` };
};

export const cssBackground = (background: Background) => {
  if (background.kind === "transparent") return undefined;
  if (background.kind === "solid") return safeColour(background.colour, "#000000");
  if (background.kind === "linear") return `linear-gradient(${normaliseAngle(background.angle) + 90}deg, ${safeColour(background.startColour)} 0%, ${safeColour(background.endColour)} 100%)`;
  return `radial-gradient(circle at ${clampUnit(background.centerX) * 100}% ${clampUnit(background.centerY) * 100}%, ${safeColour(background.innerColour)} 0%, ${safeColour(background.outerColour)} ${Math.max(0.01, background.spread) * 100}%)`;
};

export const parseBackgroundColour = (value: string | null, fallback: string) => isHexColour(value ?? undefined) ? value as string : fallback;
