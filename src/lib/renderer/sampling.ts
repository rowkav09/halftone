export const ASPECT_PRESETS = [
  { id: "current", label: "Current cells", value: 0.6 },
  { id: "square", label: "Square cells", value: 1 },
  { id: "tall", label: "Tall cells", value: 1.4 },
] as const;

export type AspectPresetId = (typeof ASPECT_PRESETS)[number]["id"];
export type FitMode = "contain" | "cover" | "stretch";
export type CropPosition =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export type SourceRegion = {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  destinationX: number;
  destinationY: number;
  destinationWidth: number;
  destinationHeight: number;
};

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const cropAlignment = (position: CropPosition) => {
  const horizontal = position.endsWith("left") ? 0 : position.endsWith("right") ? 1 : 0.5;
  const vertical = position.startsWith("top") ? 0 : position.startsWith("bottom") ? 1 : 0.5;
  return [horizontal, vertical] as const;
};

export const getSourceRegion = (
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fit: FitMode,
  cropPosition: CropPosition = "center",
): SourceRegion => {
  if (fit === "stretch") {
    return { sourceX: 0, sourceY: 0, sourceWidth, sourceHeight, destinationX: 0, destinationY: 0, destinationWidth: targetWidth, destinationHeight: targetHeight };
  }
  const sourceAspect = sourceWidth / Math.max(1, sourceHeight);
  const targetAspect = targetWidth / Math.max(1, targetHeight);
  const [horizontal, vertical] = cropAlignment(cropPosition);
  if (fit === "cover") {
    if (sourceAspect > targetAspect) {
      const visibleWidth = sourceHeight * targetAspect;
      return { sourceX: (sourceWidth - visibleWidth) * horizontal, sourceY: 0, sourceWidth: visibleWidth, sourceHeight, destinationX: 0, destinationY: 0, destinationWidth: targetWidth, destinationHeight: targetHeight };
    }
    const visibleHeight = sourceWidth / targetAspect;
    return { sourceX: 0, sourceY: (sourceHeight - visibleHeight) * vertical, sourceWidth, sourceHeight: visibleHeight, destinationX: 0, destinationY: 0, destinationWidth: targetWidth, destinationHeight: targetHeight };
  }
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const destinationWidth = sourceWidth * scale;
  const destinationHeight = sourceHeight * scale;
  return {
    sourceX: 0,
    sourceY: 0,
    sourceWidth,
    sourceHeight,
    destinationX: (targetWidth - destinationWidth) * horizontal,
    destinationY: (targetHeight - destinationHeight) * vertical,
    destinationWidth,
    destinationHeight,
  };
};

export const clampAspectFactor = (value: number) => Math.min(2, Math.max(0.25, Number.isFinite(value) ? value : 0.6));
export const clampGrainAmount = (value: number) => clampUnit(Number.isFinite(value) ? value : 0);
