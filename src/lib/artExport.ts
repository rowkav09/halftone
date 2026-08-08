import type { GeneratedArt } from "@/lib/art";
import type { BackgroundConfig } from "@/lib/renderer/types";

const escapeMarkup = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const isHexColour = (value: string | undefined) => Boolean(value && /^#[\da-f]{6}$/i.test(value));
const safeColour = (value: string | undefined, fallback: string) => isHexColour(value) ? value as string : fallback;

const hexToRgb = (value: string) => {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  if (!match) return [232, 237, 242] as const;
  return [Number.parseInt(match[1] ?? "e8", 16), Number.parseInt(match[2] ?? "ed", 16), Number.parseInt(match[3] ?? "f2", 16)] as const;
};

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

export const getBackgroundCss = (config?: BackgroundConfig, fallbackSolid = "#000000"): string => {
  if (!config) return `background:${fallbackSolid};`;
  if (config.type === "transparent") return "background:transparent;";
  if (config.type === "solid") return `background:${config.solidColor};`;
  if (config.type === "linear") {
    return `background:linear-gradient(${config.gradientAngle}deg, ${config.gradientStart} 0%, ${config.gradientEnd} 100%);`;
  }
  if (config.type === "radial") {
    return `background:radial-gradient(circle at ${config.radialCenterX}% ${config.radialCenterY}%, ${config.radialInner} 0%, ${config.radialOuter} ${config.radialSpread}%);`;
  }
  return `background:${fallbackSolid};`;
};

/** A self-contained preformatted snippet with grouped inline colours. */
export const generateHtmlExport = (art: GeneratedArt, options: HtmlExportOptions = {}) => {
  const fallback = safeColour(art.foreground, "#e8edf2");
  const rows = art.lines.map((line, row) => colouredHtmlLine(line, art.colors[row] ?? [], fallback)).join("\n");
  const backgroundStyle = getBackgroundCss(art.backgroundConfig, art.background);
  const lineHeight = Math.min(3, Math.max(0.5, options.lineHeight ?? 1.25));
  const padding = Math.max(0, options.padding ?? 24);
  return `<pre style="margin:0;${backgroundStyle}color:${fallback};padding:${padding}px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:16px;line-height:${lineHeight};white-space:pre;">${rows}</pre>`;
};

const angleToCoordinates = (angle: number) => {
  const angleRad = (angle * Math.PI) / 180;
  // Map angle to SVG coordinates (0% to 100%)
  const x1 = Math.round(50 - Math.cos(angleRad) * 50);
  const y1 = Math.round(50 - Math.sin(angleRad) * 50);
  const x2 = Math.round(50 + Math.cos(angleRad) * 50);
  const y2 = Math.round(50 + Math.sin(angleRad) * 50);
  return { x1, y1, x2, y2 };
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

  let bgDefs = "";
  let bgFill = `fill="${art.background}"`;

  const config = art.backgroundConfig;
  if (config) {
    if (config.type === "transparent") {
      bgFill = `fill="none"`;
    } else if (config.type === "solid") {
      bgFill = `fill="${config.solidColor}"`;
    } else if (config.type === "linear") {
      const coords = angleToCoordinates(config.gradientAngle);
      bgDefs = `
  <defs>
    <linearGradient id="bg-grad" x1="${coords.x1}%" y1="${coords.y1}%" x2="${coords.x2}%" y2="${coords.y2}%">
      <stop offset="0%" stop-color="${config.gradientStart}" />
      <stop offset="100%" stop-color="${config.gradientEnd}" />
    </linearGradient>
  </defs>`;
      bgFill = `fill="url(#bg-grad)"`;
    } else if (config.type === "radial") {
      bgDefs = `
  <defs>
    <radialGradient id="bg-grad" cx="${config.radialCenterX}%" cy="${config.radialCenterY}%" r="${config.radialSpread}%">
      <stop offset="0%" stop-color="${config.radialInner}" />
      <stop offset="100%" stop-color="${config.radialOuter}" />
    </radialGradient>
  </defs>`;
      bgFill = `fill="url(#bg-grad)"`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bgDefs}<rect width="100%" height="100%" ${bgFill}/><g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${fontSize}" xml:space="preserve">${text}</g></svg>`;
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
