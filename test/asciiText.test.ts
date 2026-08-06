import { describe, expect, it } from "vitest";
import { createAsciiBanner } from "@/lib/asciiText";

const style = {
  fill: "#",
  outline: false,
  shadow: "",
  slant: false,
  spacing: 1,
};

describe("createAsciiBanner", () => {
  it("returns repeatable compact glyph rows", () => {
    const first = createAsciiBanner("Hi", style, 40);
    const second = createAsciiBanner("Hi", style, 40);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first.join("\n")).toContain("#");
  });

  it("applies width limits and deterministic style transforms", () => {
    const rendered = createAsciiBanner("A", { ...style, outline: true, shadow: ".", slant: true }, 8);
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered).toEqual(createAsciiBanner("A", { ...style, outline: true, shadow: ".", slant: true }, 8));
  });
});
