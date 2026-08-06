import { describe, expect, it } from "vitest";
import { applyFigletColours, DEFAULT_FIGLET_COLOUR_SETTINGS, getFigletBackground } from "@/lib/textColour";
import type { GeneratedArt } from "@/lib/art";

const art: GeneratedArt = {
  lines: ["AB", "CD"],
  colors: [],
  columns: 2,
  rows: 2,
  foreground: "#ffffff",
  background: "#000000",
};

describe("figlet text colours", () => {
  it("applies deterministic gradients and updates foreground", () => {
    const settings = { ...DEFAULT_FIGLET_COLOUR_SETTINGS, style: "horizontal" as const, gradientStart: "#000000", gradientEnd: "#ffffff" };
    const first = applyFigletColours(art, settings);
    const second = applyFigletColours(art, settings);

    expect(first).toEqual(second);
    expect(first.colors).toEqual([["#000000", "#ffffff"], ["#000000", "#ffffff"]]);
    expect(first.foreground).toBe("#000000");
  });

  it("uses explicit backgrounds only when enabled", () => {
    expect(getFigletBackground({ ...DEFAULT_FIGLET_COLOUR_SETTINGS, includeBackground: false })).toBeUndefined();
    expect(getFigletBackground({ ...DEFAULT_FIGLET_COLOUR_SETTINGS, includeBackground: true, background: "#123456" })).toBe("#123456");
  });
});
