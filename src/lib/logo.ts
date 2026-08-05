export type LogoStyle = {
  id: string;
  label: string;
  fontFamily: "sans" | "mono";
  fontWeight: number;
  italic: boolean;
  scaleX: number;
  skew: number;
  letterSpacing: string;
  outline: boolean;
  glow: boolean;
};

export const LOGO_TEXT = "HALFTONE";
export const LOGO_ROTATION_MS = 1500;

const families: LogoStyle["fontFamily"][] = ["sans", "mono"];
const labels = ["Block", "Terminal", "Cyber", "Outline", "Minimal", "Retro", "Wide", "Condensed", "Slant", "Signal"];
const weights = [400, 500, 600, 700, 800, 900] as const;
const scales = [0.78, 0.86, 0.94, 1, 1.08] as const;
const tracking = ["0.04em", "0.1em", "0.16em", "0.22em", "0.3em"] as const;

/**
 * Branding-only presentation styles. These deliberately contain no image or
 * generator settings so the header cannot inherit user input.
 */
export const LOGO_STYLES: readonly LogoStyle[] = Array.from({ length: 50 }, (_, index) => {
  const group = Math.floor(index / 5);

  return {
    id: `logo-${index + 1}`,
    label: labels[group] ?? "Halftone",
    fontFamily: families[index % families.length] ?? "sans",
    fontWeight: weights[(index + group) % weights.length] ?? 700,
    italic: group === 8 || (group === 5 && index % 2 === 0),
    scaleX: scales[index % scales.length] ?? 1,
    skew: group === 2 ? 7 : group === 8 ? -9 : group === 5 ? -4 : 0,
    letterSpacing: tracking[(index + group) % tracking.length] ?? "0.1em",
    outline: group === 3 || (group === 2 && index % 3 === 0),
    glow: group === 1 || group === 2 || group === 9,
  };
});
