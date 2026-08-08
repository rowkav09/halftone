import { describe, expect, it } from "vitest";
import { createColourTreatmentResolver } from "@/lib/colourTreatment";

describe("colour treatments", () => {
  it("keeps source colours unchanged", () => {
    const resolve = createColourTreatmentResolver({ kind: "source" });
    expect(resolve([12, 34, 56], 0.5, "#0c2238")).toBe("#0c2238");
  });

  it("maps duotone endpoints to shadow and highlight", () => {
    const resolve = createColourTreatmentResolver({
      kind: "duotone",
      shadowColour: "#101820",
      highlightColour: "#f5f7fa",
    });
    expect(resolve([0, 0, 0], 0, "#000000")).toBe("#101820");
    expect(resolve([255, 255, 255], 1, "#ffffff")).toBe("#f5f7fa");
  });

  it("interpolates gradient-map stops across luminance", () => {
    const resolve = createColourTreatmentResolver({
      kind: "gradient-map",
      stops: ["#000000", "#ffffff", "#ff0000"],
    });
    expect(resolve([0, 0, 0], 0, "#000000")).toBe("#000000");
    expect(resolve([128, 128, 128], 0.25, "#808080")).toBe("#808080");
    expect(resolve([255, 255, 255], 1, "#ffffff")).toBe("#ff0000");
  });
});
