import { afterEach, describe, expect, it } from "vitest";
import { generateArtFromCanvas, getCharactersForSet, sanitizeCustomCharacters, type ArtOptions } from "@/lib/art";
import { installCanvasMock } from "./helpers/canvas";

const options: ArtOptions = {
  columns: 24,
  characterSet: "ascii",
  customText: "",
  colorMode: "monochrome",
  colorCount: 0,
  palette: "terminal",
  invert: false,
  ditherAlgorithm: "none",
  renderMode: "density",
  adjustments: { ditherStrength: 0, threshold: 0 },
};

let restore: (() => void) | undefined;
afterEach(() => restore?.());

describe("art renderer", () => {
  it("sanitizes custom characters and falls back safely", () => {
    expect(sanitizeCustomCharacters(" a a\n b ")).toBe("ab");
    expect(getCharactersForSet("custom", "  ")).toBe(getCharactersForSet("ascii", ""));
  });

  it("renders the same fixed mocked canvas consistently", () => {
    const mock = installCanvasMock([20, 100, 180, 255]);
    restore = mock.restore;
    const first = generateArtFromCanvas(mock.source, options);
    const second = generateArtFromCanvas(mock.source, options);

    expect(first).toEqual(second);
    expect(first).toMatchObject({ columns: 24, rows: 14, foreground: "#c8ffbf", background: { kind: "solid", colour: "#041108" }, backgroundColour: "#041108", colourTreatment: { kind: "monochrome" } });
    expect(first.lines).toHaveLength(14);
    expect(first.lines.every((line) => line.length === 24)).toBe(true);
    expect(first.colors.every((row) => row.length === 24)).toBe(true);
  });
});
