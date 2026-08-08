import type { GeneratedArt } from "@/lib/art";
import { cssBackground, svgBackground } from "@/lib/background";
import { hexToRgb, safeColour } from "@/lib/colour";

const escapeMarkup = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const colouredRuns = (line: string, colors: string[], fallback: string) => {
  const runs: Array<{ text: string; color: string }> = [];
  Array.from(line).forEach((glyph, index) => {
    const color = colors[index] ?? fallback;
    const current = runs[runs.length - 1];
    if (current?.color === color) current.text += glyph;
    else runs.push({ text: glyph, color });
  });
  return runs;
};

const colouredHtmlLine = (line: string, colors: string[], fallback: string) => {
  let output = "";
  let run = "";
  let activeColour = "";
  const flush = () => {
    if (!run) return;
    output += `<span style="color:${safeColour(activeColour, fallback)}">${escapeMarkup(run)}</span>`;
    run = "";
  };
  Array.from(line).forEach((glyph, index) => {
    if (/\s/u.test(glyph)) {
      flush();
      // white-space:pre keeps literal spaces and tabs exact without extra spans.
      output += escapeMarkup(glyph);
      return;
    }
    const colour = colors[index] ?? fallback;
    if (run && colour !== activeColour) flush();
    activeColour = colour;
    run += glyph;
  });
  flush();
  return output;
};

export type HtmlExportOptions = {
  background?: string | null;
  lineHeight?: number;
  padding?: number;
};

/** A self-contained preformatted snippet with grouped inline colours. */
export const generateHtmlExport = (art: GeneratedArt, options: HtmlExportOptions = {}) => {
  const fallback = safeColour(art.foreground, "#e8edf2");
  const rows = art.lines.map((line, row) => colouredHtmlLine(line, art.colors[row] ?? [], fallback)).join("\n");
  const backgroundValue = options.background === null ? undefined : options.background ?? cssBackground(art.background);
  const background = backgroundValue ? `background:${options.background ? safeColour(backgroundValue, "#000000") : backgroundValue};` : "";
  const lineHeight = Math.min(3, Math.max(0.5, options.lineHeight ?? 1.25));
  const padding = Math.max(0, options.padding ?? 24);
  return `<pre style="margin:0;${background}color:${fallback};padding:${padding}px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:16px;line-height:${lineHeight};white-space:pre;">${rows}</pre>`;
};

/** A standalone SVG made from text nodes, suitable for browser and design-tool import. */
export const generateSvgExport = (art: GeneratedArt) => {
  const fontSize = 16;
  const glyphWidth = 9.6;
  const lineHeight = 20;
  const padding = 24;
  const width = Math.ceil(art.columns * glyphWidth + padding * 2);
  const height = Math.ceil(art.rows * lineHeight + padding * 2);
  const text = art.lines.map((line, row) => {
    const y = padding + fontSize + row * lineHeight;
    return colouredRuns(line, art.colors[row] ?? [], art.foreground).map((run, runIndex, runs) => {
      const previousLength = runs.slice(0, runIndex).reduce((total, previous) => total + Array.from(previous.text).length, 0);
      return `<text x="${padding + previousLength * glyphWidth}" y="${y}" fill="${run.color}">${escapeMarkup(run.text)}</text>`;
    }).join("");
  }).join("");
  const background = svgBackground(art.background, width, height);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${background.defs}${background.rect}<g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${fontSize}" xml:space="preserve">${text}</g></svg>`;
};

/** Proper 24-bit ANSI foreground colour escapes, reset at each line ending. */
export const generateAnsiExport = (art: GeneratedArt) => art.lines.map((line, row) => {
  let activeColor = "";
  let output = "";
  Array.from(line).forEach((glyph, column) => {
    const color = art.colors[row]?.[column] ?? art.foreground;
    if (color !== activeColor) {
      const [red, green, blue] = hexToRgb(color);
      output += `\u001b[38;2;${red};${green};${blue}m`;
      activeColor = color;
    }
    output += glyph;
  });
  return `${output}\u001b[0m`;
}).join("\n");
