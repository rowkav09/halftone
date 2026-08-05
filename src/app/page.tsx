"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { HalftoneLogo } from "@/components/HalftoneLogo";
import {
  CHARACTER_SETS,
  COLOR_COUNTS,
  DEFAULT_IMAGE_ADJUSTMENTS,
  DITHER_ALGORITHMS,
  PALETTES,
  RENDER_MODES,
  type ArtOptions,
  type CharacterSetId,
  type ColorCount,
  type ColorMode,
  type DitherAlgorithm,
  type GeneratedArt,
  type ImageAdjustments,
  type PaletteId,
  type RenderMode,
  generateArtFromImage,
  sanitizeCustomCharacters,
} from "@/lib/art";
import { generateAnsiExport, generateHtmlExport, generateSvgExport } from "@/lib/artExport";
import { CUSTOM_TEXT_STYLES, TEXT_OUTPUT_FORMATS, type TextOutputFormat, formatGeneratedTextOutput, generateCustomTextArt } from "@/lib/customText";
import { DEFAULT_FIGLET_COLOUR_SETTINGS, FIGLET_COLOUR_STYLES, applyFigletColours, getFigletBackground, type FigletColourSettings } from "@/lib/textColour";

const CHARACTER_SET_OPTIONS: Array<{ id: CharacterSetId; label: string; sample: string }> = [
  { id: "ascii", label: "ASCII", sample: "@#%*+=-:." },
  { id: "braille", label: "Braille 2 × 4", sample: "⣿⣷⣶⣤⣄⣀" },
  { id: "blocks", label: "Blocks", sample: "█▓▒░" },
  { id: "unicode", label: "Unicode Dense", sample: "▁▂▃▄▅▆▇█" },
  { id: "unicodeFine", label: "Unicode Fine", sample: "@#WMW$B8&" },
  { id: "binary", label: "Binary", sample: "01" },
  { id: "matrix", label: "Matrix", sample: "ｱｲｳｴｵ0123" },
  { id: "symbols", label: "Symbols", sample: "!<>/\\|[]{}()" },
  { id: "custom", label: "Custom glyphs", sample: "ROWAN" },
];

const DITHER_LABELS: Record<DitherAlgorithm, string> = {
  none: "None",
  bayer2: "Bayer 2 × 2",
  bayer4: "Bayer 4 × 4",
  bayer8: "Bayer 8 × 8",
  "floyd-steinberg": "Floyd–Steinberg",
};

const RENDER_LABELS: Record<RenderMode, string> = { density: "Density", edge: "Edge", hybrid: "Hybrid" };
const RESOLUTION_MIN = 48;
const RESOLUTION_MAX = 240;
const RESOLUTION_STEP = 4;
const RESOLUTION_MARKS = [48, 80, 112, 144, 176, 208, 240] as const;
const USAGE_ENDPOINT = "/api/uses";

const IMAGE_PRESETS: Array<{ id: string; name: string; description: string; characterSet: CharacterSetId; dither: DitherAlgorithm; renderMode: RenderMode; invert: boolean; adjustments: ImageAdjustments }> = [
  { id: "balanced", name: "Balanced", description: "Clean detail with a gentle ordered pattern.", characterSet: "ascii", dither: "bayer4", renderMode: "hybrid", invert: true, adjustments: DEFAULT_IMAGE_ADJUSTMENTS },
  { id: "detail", name: "Fine detail", description: "More tonal steps with error diffusion.", characterSet: "unicodeFine", dither: "floyd-steinberg", renderMode: "hybrid", invert: true, adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 12, sharpness: 32 } },
  { id: "ink", name: "Ink", description: "High-contrast blocks for graphic images.", characterSet: "blocks", dither: "bayer4", renderMode: "density", invert: true, adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 30, threshold: 0.42 } },
  { id: "outline", name: "Outline", description: "Sobel-driven contours and silhouettes.", characterSet: "ascii", dither: "none", renderMode: "edge", invert: true, adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 18, sharpness: 48 } },
  { id: "terminal", name: "Terminal", description: "Dense Braille cells for compact portraits.", characterSet: "braille", dither: "floyd-steinberg", renderMode: "hybrid", invert: true, adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 16, gamma: 0.85 } },
];

const canvasMetrics = (generated: GeneratedArt) => {
  const dense = generated.columns >= 176;
  const fontSize = dense ? 11 : 16;
  const padding = dense ? 12 : 20;
  const glyphAdvance = dense ? 7 : 12;
  const lineHeight = dense ? 11 : 20;
  return { fontSize, padding, glyphAdvance, lineHeight, width: Math.max(1, generated.columns * glyphAdvance + padding * 2), height: Math.max(1, generated.rows * lineHeight + padding * 2) };
};

const download = (name: string, content: BlobPart, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

function RangeControl({ label, value, min, max, step, suffix = "", onChange, format }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void; format?: (value: number) => string }) {
  return <label className="block border-b border-white/[0.07] pb-2 last:border-0 last:pb-0"><span className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500"><span>{label}</span><span className="text-slate-300">{format ? format(value) : `${value}${suffix}`}</span></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-1.5 w-full accent-emerald-300" /></label>;
}

function ColouredFigletLine({ line, colors, fallback, row }: { line: string; colors: string[]; fallback: string; row: number }) {
  const nodes: ReactNode[] = [];
  let run = "";
  let activeColour = "";
  const flush = (key: number) => {
    if (!run) return;
    nodes.push(<span key={`${row}-${key}`} style={{ color: activeColour || fallback }}>{run}</span>);
    run = "";
  };
  Array.from(line).forEach((glyph, column) => {
    if (/\s/u.test(glyph)) {
      flush(column);
      nodes.push(glyph);
      return;
    }
    const colour = colors[column] ?? fallback;
    if (run && colour !== activeColour) flush(column);
    activeColour = colour;
    run += glyph;
  });
  flush(line.length);
  return <>{nodes}</>;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileUrlRef = useRef<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const urlHydratedRef = useRef(false);

  const [mode, setMode] = useState<"image" | "text">("image");
  const [status, setStatus] = useState("Choose an image or create an ASCII text banner.");
  const [characterSet, setCharacterSet] = useState<CharacterSetId>("ascii");
  const [customGlyphs, setCustomGlyphs] = useState("ROWAN");
  const [textValue, setTextValue] = useState("HELLO");
  const [textStyleIndex, setTextStyleIndex] = useState(0);
  const [textOutputFormat, setTextOutputFormat] = useState<TextOutputFormat["id"]>("ascii");
  const [figletColourSettings, setFigletColourSettings] = useState<FigletColourSettings>(DEFAULT_FIGLET_COLOUR_SETTINGS);
  const [resolutionColumns, setResolutionColumns] = useState(84);
  const [invert, setInvert] = useState(true);
  const [palette, setPalette] = useState<PaletteId>("bw");
  const [colorMode, setColorMode] = useState<ColorMode>("colour");
  const [colorCount, setColorCount] = useState<ColorCount>(0);
  const [ditherAlgorithm, setDitherAlgorithm] = useState<DitherAlgorithm>("none");
  const [renderMode, setRenderMode] = useState<RenderMode>("density");
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_IMAGE_ADJUSTMENTS);
  const [renderCount, setRenderCount] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [htmlCopyState, setHtmlCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [generatedArt, setGeneratedArt] = useState<GeneratedArt | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(50);

  const activeTextStyle = CUSTOM_TEXT_STYLES[textStyleIndex] ?? CUSTOM_TEXT_STYLES[0];
  const activePalette = useMemo(() => PALETTES.find((option) => option.id === palette) ?? PALETTES[0], [palette]);
  const colouredTextArt = useMemo(() => mode === "text" && generatedArt ? applyFigletColours(generatedArt, figletColourSettings) : null, [figletColourSettings, generatedArt, mode]);
  const displayArt = useMemo(() => mode === "text" && colouredTextArt ? formatGeneratedTextOutput(colouredTextArt, textOutputFormat) : generatedArt, [colouredTextArt, generatedArt, mode, textOutputFormat]);
  const artLines = useMemo(() => displayArt?.lines ?? [], [displayArt]);
  const previewColumns = Math.max(...artLines.map((line) => line.length), 0);
  const textBackground = useMemo(() => getFigletBackground(figletColourSettings), [figletColourSettings]);
  const exportName = mode === "text" ? textValue.trim().toLowerCase().replace(/\s+/g, "-") || "text-art" : "halftone";
  const previewAspect = useMemo(() => generatedArt ? canvasMetrics(generatedArt).width / canvasMetrics(generatedArt).height : 1.5, [generatedArt]);

  const incrementUsage = useCallback(async () => {
    try {
      const response = await fetch(USAGE_ENDPOINT, { method: "POST" });
      const data = response.ok ? await response.json() as { count?: number } : null;
      if (typeof data?.count === "number") setRenderCount(data.count);
    } catch { /* Usage tracking must never block browser-side rendering. */ }
  }, []);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setStatus("Please choose an image file."); return; }
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    setImageUrl(url);
    setMode("image");
    setImageReady(false);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => { imageRef.current = image; setImageReady(true); setStatus("Image loaded. Tune the live renderer below."); void incrementUsage(); };
    image.onerror = () => { setStatus("That file could not be loaded as an image."); setImageReady(false); };
    image.src = url;
  }, [incrementUsage]);

  const drawGeneratedArt = useCallback((generated: GeneratedArt) => {
    const canvas = previewCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) throw new Error("Canvas 2D context is unavailable.");
    const metrics = canvasMetrics(generated);
    canvas.width = metrics.width;
    canvas.height = metrics.height;
    context.fillStyle = generated.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = `${metrics.fontSize}px var(--font-mono), ui-monospace, monospace`;
    context.textBaseline = "top";
    generated.lines.forEach((line, row) => Array.from(line).forEach((glyph, column) => {
      context.fillStyle = generated.colors[row]?.[column] ?? generated.foreground;
      context.fillText(glyph, metrics.padding + column * metrics.glyphAdvance, metrics.padding + row * metrics.lineHeight);
    }));
  }, []);

  const renderArt = useCallback(async () => {
    if (mode === "image" && !imageRef.current) return;
    if (!activeTextStyle) return;
    setIsRendering(true);
    try {
      const options: ArtOptions = { columns: resolutionColumns, characterSet, customText: customGlyphs, invert, palette, colorMode, colorCount, ditherAlgorithm, renderMode, adjustments };
      const generated = mode === "text" ? generateCustomTextArt(textValue, activeTextStyle) : await generateArtFromImage(imageRef.current as HTMLImageElement, options);
      setGeneratedArt(generated);
      if (mode === "image") drawGeneratedArt(generated);
      setStatus(`Rendered ${generated.columns} × ${generated.rows} characters.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to render the preview.");
    } finally { setIsRendering(false); }
  }, [activeTextStyle, adjustments, characterSet, colorCount, colorMode, customGlyphs, ditherAlgorithm, drawGeneratedArt, invert, mode, palette, renderMode, resolutionColumns, textValue]);

  const updateAdjustment = useCallback((key: keyof ImageAdjustments, value: number) => setAdjustments((current) => ({ ...current, [key]: value })), []);

  const resetImageSettings = useCallback(() => {
    setCharacterSet("ascii");
    setResolutionColumns(84);
    setInvert(true);
    setPalette("bw");
    setColorMode("colour");
    setColorCount(0);
    setDitherAlgorithm("none");
    setRenderMode("density");
    setAdjustments(DEFAULT_IMAGE_ADJUSTMENTS);
    setStatus("Image settings reset to the accuracy-first default.");
  }, []);

  const copyText = useCallback(async () => {
    if (!artLines.length) return;
    try {
      await navigator.clipboard.writeText(artLines.join("\n"));
      setCopyState("copied");
      setStatus("Copied ASCII text to clipboard.");
    } catch { setCopyState("failed"); setStatus("Could not copy automatically. Use Export TXT instead."); }
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopyState("idle"), 1800);
  }, [artLines]);

  const updateFigletColour = useCallback(<Key extends keyof FigletColourSettings>(key: Key, value: FigletColourSettings[Key]) => {
    setFigletColourSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const textHtmlOptions = useMemo(() => ({ background: textBackground ?? null, lineHeight: figletColourSettings.lineHeight, padding: 0 }), [figletColourSettings.lineHeight, textBackground]);
  const copyHtml = useCallback(async () => {
    if (!displayArt || mode !== "text") return;
    try {
      await navigator.clipboard.writeText(generateHtmlExport(displayArt, textHtmlOptions));
      setHtmlCopyState("copied");
      setStatus("Copied colour-preserving HTML.");
    } catch {
      setHtmlCopyState("failed");
      setStatus("Could not copy HTML automatically. Use Export HTML instead.");
    }
    window.setTimeout(() => setHtmlCopyState("idle"), 1800);
  }, [displayArt, mode, textHtmlOptions]);

  useEffect(() => {
    let cancelled = false;
    void fetch(USAGE_ENDPOINT, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data: { count?: number } | null) => {
      if (!cancelled && typeof data?.count === "number") setRenderCount(data.count);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
  }, []);

  useEffect(() => {
    if (mode === "image" && !imageReady) return;
    const timer = window.setTimeout(() => void renderArt(), 80);
    return () => window.clearTimeout(timer);
  }, [imageReady, mode, renderArt]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const image = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
      if (image) { event.preventDefault(); loadFile(image); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadFile]);

  useEffect(() => {
    const hydrate = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("v") !== "2") {
        // Older builds accidentally serialised empty settings as zeroes. Do not
        // restore those destructive values into the new renderer.
        if (params.size > 0) window.history.replaceState(null, "", window.location.pathname);
        urlHydratedRef.current = true;
        return;
      }
      const numeric = (key: string, fallback: number) => {
        const raw = params.get(key);
        if (raw === null || raw.trim() === "") return fallback;
        const value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
      };
      const queryCharacterSet = params.get("set") as CharacterSetId | null;
      const queryDither = params.get("dither") as DitherAlgorithm | null;
      const queryMode = params.get("render") as RenderMode | null;
      const queryPalette = params.get("palette") as PaletteId | null;
      const queryGlyphs = params.get("glyphs");
      if (queryCharacterSet && (queryCharacterSet === "custom" || queryCharacterSet in CHARACTER_SETS)) setCharacterSet(queryCharacterSet);
      if (queryGlyphs !== null) setCustomGlyphs(queryGlyphs);
      if (queryDither && DITHER_ALGORITHMS.includes(queryDither)) setDitherAlgorithm(queryDither);
      if (queryMode && RENDER_MODES.includes(queryMode)) setRenderMode(queryMode);
      if (queryPalette && PALETTES.some((item) => item.id === queryPalette)) setPalette(queryPalette);
      setResolutionColumns(Math.min(RESOLUTION_MAX, Math.max(RESOLUTION_MIN, numeric("res", resolutionColumns))));
      setInvert(params.get("invert") !== "0");
      setColorMode(params.get("colour") === "mono" ? "monochrome" : "colour");
      setColorCount(COLOR_COUNTS.includes(numeric("colors", colorCount) as ColorCount) ? numeric("colors", colorCount) as ColorCount : colorCount);
      setAdjustments({ brightness: numeric("bright", 0), contrast: numeric("contrast", 0), gamma: numeric("gamma", 1), saturation: numeric("sat", 1), threshold: numeric("threshold", 0), ditherStrength: numeric("strength", 1), sharpness: numeric("sharp", 0), blur: numeric("blur", 0) });
      urlHydratedRef.current = true;
    };
    const timer = window.setTimeout(hydrate, 0);
    return () => window.clearTimeout(timer);
    // Query parameters intentionally exclude the uploaded file and typed banner text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!urlHydratedRef.current) return;
    const params = new URLSearchParams();
    params.set("v", "2");
    params.set("res", String(resolutionColumns));
    params.set("set", characterSet);
    params.set("glyphs", customGlyphs);
    params.set("dither", ditherAlgorithm);
    params.set("render", renderMode);
    params.set("invert", invert ? "1" : "0");
    params.set("palette", palette);
    params.set("colour", colorMode === "colour" ? "colour" : "mono");
    params.set("colors", String(colorCount));
    params.set("bright", String(adjustments.brightness));
    params.set("contrast", String(adjustments.contrast));
    params.set("gamma", String(adjustments.gamma));
    params.set("sat", String(adjustments.saturation));
    params.set("threshold", String(adjustments.threshold));
    params.set("strength", String(adjustments.ditherStrength));
    params.set("sharp", String(adjustments.sharpness));
    params.set("blur", String(adjustments.blur));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [adjustments, characterSet, colorCount, colorMode, customGlyphs, ditherAlgorithm, invert, palette, renderMode, resolutionColumns]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']") || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "r") { event.preventDefault(); resetImageSettings(); }
      if (event.key.toLowerCase() === "c") { event.preventDefault(); void copyText(); }
      if (event.key.toLowerCase() === "u") { event.preventDefault(); inputRef.current?.click(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copyText, resetImageSettings]);

  const characterSetDisplay = useMemo(() => characterSet === "custom" ? sanitizeCustomCharacters(customGlyphs) || CHARACTER_SETS.ascii : CHARACTER_SETS[characterSet], [characterSet, customGlyphs]);
  const applyPreset = (preset: typeof IMAGE_PRESETS[number]) => {
    setCharacterSet(preset.characterSet);
    setDitherAlgorithm(preset.dither);
    setRenderMode(preset.renderMode);
    setInvert(preset.invert);
    setAdjustments(preset.adjustments);
    setStatus(`${preset.name} preset applied.`);
  };

  const exportText = () => download(`${exportName}.txt`, artLines.join("\n"), "text/plain;charset=utf-8");
  const exportPng = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => { if (blob) download(`${exportName}.png`, blob, "image/png"); }, "image/png");
  };

  return <main className="min-h-screen bg-black text-slate-100">
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-4 lg:px-5">
      <header className="border-b border-white/10 pb-3">
        <div className="flex justify-end pb-2"><span className="rounded-sm border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">{renderCount.toLocaleString()} generations</span></div>
        <HalftoneLogo />
      </header>

      <div className="grid flex-1 gap-4 xl:grid-cols-[292px_minmax(0,1fr)_292px]">
        <section className="space-y-3 rounded-md border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm">
          <div className={`rounded-md border border-dashed p-3 transition ${isDragging ? "border-emerald-300 bg-emerald-300/10" : "border-white/15 bg-black/40"}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files.item(0); if (file) loadFile(file); }}>
            <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) loadFile(file); }} />
            <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Upload image</p><p className="mt-1 text-xs text-slate-500">Drop, browse, or paste.</p></div><button type="button" onClick={() => inputRef.current?.click()} className="rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:-translate-y-px hover:bg-white/10 active:translate-y-0">Browse</button></div>
          </div>

          <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Create from</h2>
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode("image")} className={`rounded-sm border px-3 py-2 text-sm transition hover:bg-white/10 ${mode === "image" ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-300"}`}>Image</button><button type="button" onClick={() => setMode("text")} className={`rounded-sm border px-3 py-2 text-sm transition hover:bg-white/10 ${mode === "text" ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-300"}`}>Text</button></div>
            {mode === "text" ? <><textarea value={textValue} onChange={(event) => setTextValue(event.target.value)} rows={2} className="w-full rounded-sm border border-white/10 bg-black/70 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-300/40" placeholder="HELLO" /><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Text style<select value={textStyleIndex} onChange={(event) => setTextStyleIndex(Number(event.target.value))} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{CUSTOM_TEXT_STYLES.map((style, index) => <option key={style.id} value={index}>{style.name}</option>)}</select></label><div className="space-y-3 border-t border-white/10 pt-3"><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Colour treatment<select value={figletColourSettings.style} onChange={(event) => updateFigletColour("style", event.target.value as FigletColourSettings["style"])} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{FIGLET_COLOUR_STYLES.map((style) => <option key={style.id} value={style.id}>{style.name}</option>)}</select></label>{figletColourSettings.style === "solid" ? <label className="flex items-center justify-between text-xs text-slate-300"><span>Solid colour</span><input aria-label="Solid text colour" type="color" value={figletColourSettings.solid} onChange={(event) => updateFigletColour("solid", event.target.value)} className="h-8 w-10 rounded-sm border border-white/10 bg-black p-1" /></label> : null}{figletColourSettings.style === "horizontal" || figletColourSettings.style === "vertical" ? <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">Start<input aria-label="Gradient start colour" type="color" value={figletColourSettings.gradientStart} onChange={(event) => updateFigletColour("gradientStart", event.target.value)} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label><label className="text-xs text-slate-300">End<input aria-label="Gradient end colour" type="color" value={figletColourSettings.gradientEnd} onChange={(event) => updateFigletColour("gradientEnd", event.target.value)} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label></div> : null}{figletColourSettings.style === "custom" ? <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">First colour<input aria-label="Custom gradient first colour" type="color" value={figletColourSettings.customStart} onChange={(event) => updateFigletColour("customStart", event.target.value)} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label><label className="text-xs text-slate-300">Second colour<input aria-label="Custom gradient second colour" type="color" value={figletColourSettings.customEnd} onChange={(event) => updateFigletColour("customEnd", event.target.value)} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label></div> : null}<label className="flex items-center justify-between text-xs text-slate-300"><span>Include background</span><input aria-label="Include background colour" type="checkbox" checked={figletColourSettings.includeBackground} onChange={(event) => updateFigletColour("includeBackground", event.target.checked)} className="h-4 w-4 accent-emerald-300" /></label>{figletColourSettings.includeBackground && figletColourSettings.style !== "terminal" && figletColourSettings.style !== "amber" ? <label className="flex items-center justify-between text-xs text-slate-300"><span>Background colour</span><input aria-label="Text background colour" type="color" value={figletColourSettings.background} onChange={(event) => updateFigletColour("background", event.target.value)} className="h-8 w-10 rounded-sm border border-white/10 bg-black p-1" /></label> : null}<RangeControl label="Line height" value={figletColourSettings.lineHeight} min={0.75} max={1.6} step={0.05} onChange={(value) => updateFigletColour("lineHeight", value)} format={(value) => value.toFixed(2)} /></div></> : null}
          </div>

          {mode === "image" ? <>
            <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Presets</h2><div className="grid gap-1.5">{IMAGE_PRESETS.map((preset) => <button key={preset.id} type="button" title={preset.description} onClick={() => applyPreset(preset)} className="rounded-sm border border-white/10 px-3 py-2 text-left transition hover:-translate-y-px hover:border-emerald-300/40 hover:bg-emerald-300/10 active:translate-y-0"><span className="block text-sm text-white">{preset.name}</span><span className="block text-[10px] text-slate-500">{preset.description}</span></button>)}</div></div>
            <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Character set</h2><select value={characterSet} onChange={(event) => setCharacterSet(event.target.value as CharacterSetId)} className="w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/40">{CHARACTER_SET_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><p className="font-mono text-[10px] text-slate-500">{CHARACTER_SET_OPTIONS.find((option) => option.id === characterSet)?.sample}</p>{characterSet === "custom" ? <textarea value={customGlyphs} onChange={(event) => setCustomGlyphs(event.target.value)} rows={2} className="w-full rounded-sm border border-white/10 bg-black/70 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-300/40" placeholder="@#%" /> : null}<p className="text-xs text-slate-500">Generic and custom sets are ordered by measured glyph density.</p></div>
            <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3"><div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-slate-500"><span>Resolution</span><span>{resolutionColumns} columns</span></div><div className="relative"><input type="range" min={RESOLUTION_MIN} max={RESOLUTION_MAX} step={RESOLUTION_STEP} value={resolutionColumns} onChange={(event) => setResolutionColumns(Number(event.target.value))} className="h-2 w-full accent-emerald-300" /><div aria-hidden className="pointer-events-none absolute inset-x-1 top-1/2 flex -translate-y-1/2 justify-between">{RESOLUTION_MARKS.map((mark) => <span key={mark} className={`h-1.5 w-1.5 rounded-sm ${resolutionColumns >= mark ? "bg-emerald-200" : "bg-slate-600"}`} />)}</div></div><div className="flex justify-between text-[9px] uppercase text-slate-500">{RESOLUTION_MARKS.map((mark) => <span key={mark}>{mark}</span>)}</div></div>
            <button type="button" onClick={resetImageSettings} className="w-full rounded-sm border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:-translate-y-px hover:border-white/30 hover:bg-white/10 active:translate-y-0">Reset image settings <span className="text-slate-500">R</span></button>
          </> : null}
        </section>

        <section className="flex min-h-[72vh] flex-col rounded-md border border-white/10 bg-black/60 p-3">
          <div className="mb-3 flex justify-between px-1 text-[10px] uppercase tracking-[0.3em] text-slate-500"><span>{mode === "text" ? "ASCII output" : "Preview"}</span><span>{artLines.length ? `${previewColumns} × ${artLines.length}` : "waiting"}</span></div>
          {mode === "text" ? <pre style={{ backgroundColor: textBackground ?? "transparent", lineHeight: figletColourSettings.lineHeight }} className="min-h-0 flex-1 overflow-auto rounded-md border border-white/10 p-5 font-mono text-[10px]">{displayArt ? displayArt.lines.map((line, row) => <Fragment key={`${row}-${line}`}><ColouredFigletLine line={line} colors={displayArt.colors[row] ?? []} fallback={displayArt.foreground} row={row} />{row < displayArt.lines.length - 1 ? "\n" : null}</Fragment>) : "Type text to generate an ASCII banner."}</pre> : <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md border border-white/10 bg-black p-2"><div className="relative w-full" style={{ aspectRatio: previewAspect }}><canvas ref={previewCanvasRef} className={artLines.length ? "absolute inset-0 h-full w-full" : "hidden"} />{showComparison && imageUrl && artLines.length ? <div className="absolute inset-y-0 left-0 overflow-hidden border-r border-emerald-200/70" style={{ width: `${comparisonPosition}%` }}>{/* Blob URLs are local, user-supplied images and intentionally bypass Next image optimisation. */}<img src={imageUrl} alt="Original image comparison" className="h-full w-full object-fill" /></div> : null}{!artLines.length ? <p className="absolute inset-0 grid place-items-center font-mono text-[10px] uppercase tracking-[0.26em] text-slate-500">drop image</p> : null}{isRendering ? <div className="absolute inset-0 grid place-items-center bg-black/55 text-[10px] uppercase tracking-[0.3em] text-emerald-200">Rendering</div> : null}</div></div>}
          {mode === "image" && artLines.length ? <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3"><button type="button" onClick={() => setShowComparison((current) => !current)} className={`rounded-sm border px-3 py-1.5 text-xs transition hover:bg-white/10 ${showComparison ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-300"}`}>{showComparison ? "Hide before" : "Compare before"}</button>{showComparison ? <label className="flex flex-1 items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500"><span>Before</span><input aria-label="Before and after comparison position" type="range" min="0" max="100" value={comparisonPosition} onChange={(event) => setComparisonPosition(Number(event.target.value))} className="h-1.5 flex-1 accent-emerald-300" /><span>After</span></label> : null}</div> : null}
          <p className="mt-2 text-xs text-slate-500">{status}</p>
        </section>

        <aside className="space-y-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <div className="space-y-3 rounded-md border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Export</h2><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Text wrapper<select value={textOutputFormat} onChange={(event) => setTextOutputFormat(event.target.value as TextOutputFormat["id"])} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{TEXT_OUTPUT_FORMATS.map((format) => <option key={format.id} value={format.id}>{format.name}</option>)}</select></label><p className="text-xs text-slate-500">The wrapper affects text previews, copied text, and TXT exports.</p><div className="grid grid-cols-2 gap-2"><button type="button" disabled={!artLines.length} onClick={() => void copyText()} className="rounded-sm border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40">{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy text"}</button><button type="button" disabled={!artLines.length} onClick={exportText} className="rounded-sm border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40">TXT</button>{mode === "image" ? <button type="button" disabled={!artLines.length} onClick={exportPng} className="rounded-sm bg-emerald-300 px-3 py-2 text-sm font-semibold text-black transition hover:bg-emerald-200 disabled:opacity-40">PNG</button> : null}<button type="button" disabled={!displayArt} onClick={() => displayArt && download(`${exportName}.svg`, generateSvgExport(displayArt), "image/svg+xml;charset=utf-8")} className="rounded-sm border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40">SVG</button><button type="button" disabled={!displayArt} onClick={() => displayArt && download(`${exportName}.html`, generateHtmlExport(displayArt, mode === "text" ? textHtmlOptions : undefined), "text/html;charset=utf-8")} className="rounded-sm border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40">HTML</button>{mode === "text" ? <button type="button" disabled={!displayArt} onClick={() => void copyHtml()} className="rounded-sm border border-emerald-300/30 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-300/10 disabled:opacity-40">{htmlCopyState === "copied" ? "HTML copied" : htmlCopyState === "failed" ? "HTML failed" : "Copy HTML"}</button> : null}<button type="button" disabled={!displayArt} onClick={() => displayArt && download(`${exportName}.ansi`, generateAnsiExport(displayArt), "text/plain;charset=utf-8")} className="rounded-sm border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40">ANSI</button></div><p className="text-xs text-slate-500">HTML, SVG, and ANSI retain the displayed per-character colour.</p></div>

          {mode === "image" ? <>
          <div className="space-y-3 rounded-md border border-white/10 bg-black/40 p-3"><div className="flex items-center justify-between"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Renderer</h2><button type="button" title="Copy this configuration from the address bar" onClick={() => { void navigator.clipboard.writeText(window.location.href); setStatus("Shareable settings URL copied."); }} className="text-[10px] uppercase tracking-[0.18em] text-emerald-200 transition hover:text-emerald-100">Copy link</button></div><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Dithering<select value={ditherAlgorithm} onChange={(event) => setDitherAlgorithm(event.target.value as DitherAlgorithm)} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{DITHER_ALGORITHMS.map((algorithm) => <option key={algorithm} value={algorithm}>{DITHER_LABELS[algorithm]}</option>)}</select></label><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Render mode<select value={renderMode} onChange={(event) => setRenderMode(event.target.value as RenderMode)} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{RENDER_MODES.map((renderOption) => <option key={renderOption} value={renderOption}>{RENDER_LABELS[renderOption]}</option>)}</select></label><div className="flex items-center justify-between border-t border-white/[0.07] pt-3"><div><h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Invert</h3><p className="mt-1 text-xs text-slate-500">Dark/light swap</p></div><button type="button" onClick={() => setInvert((value) => !value)} className={`h-7 w-12 rounded-sm border transition ${invert ? "border-emerald-300/40 bg-emerald-300/20" : "border-white/10 bg-white/10"}`} aria-label="Invert output" aria-pressed={invert}><span className={`block h-4 w-4 rounded-sm bg-white transition ${invert ? "translate-x-6" : "translate-x-1"}`} /></button></div></div>

          {mode === "image" ? <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Image controls</h2><RangeControl label="Brightness" value={adjustments.brightness} min={-100} max={100} step={1} onChange={(value) => updateAdjustment("brightness", value)} format={(value) => `${value > 0 ? "+" : ""}${value}`} /><RangeControl label="Contrast" value={adjustments.contrast} min={-100} max={100} step={1} onChange={(value) => updateAdjustment("contrast", value)} format={(value) => `${value > 0 ? "+" : ""}${value}`} /><RangeControl label="Gamma" value={adjustments.gamma} min={0.4} max={2.5} step={0.05} onChange={(value) => updateAdjustment("gamma", value)} format={(value) => value.toFixed(2)} /><RangeControl label="Saturation" value={adjustments.saturation} min={0} max={2} step={0.05} onChange={(value) => updateAdjustment("saturation", value)} format={(value) => `${Math.round(value * 100)}%`} /><RangeControl label="Threshold" value={adjustments.threshold} min={0} max={0.95} step={0.05} onChange={(value) => updateAdjustment("threshold", value)} format={(value) => value === 0 ? "Off" : `${Math.round(value * 100)}%`} /><RangeControl label="Dither strength" value={adjustments.ditherStrength} min={0} max={1} step={0.05} onChange={(value) => updateAdjustment("ditherStrength", value)} format={(value) => `${Math.round(value * 100)}%`} /><RangeControl label="Sharpness" value={adjustments.sharpness} min={0} max={100} step={1} onChange={(value) => updateAdjustment("sharpness", value)} suffix="%" /><RangeControl label="Blur" value={adjustments.blur} min={0} max={4} step={0.25} onChange={(value) => updateAdjustment("blur", value)} format={(value) => value === 0 ? "Off" : value.toFixed(2)} /></div> : null}

          <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Colour</h2><button type="button" onClick={() => setColorMode("colour")} className={`flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left transition hover:bg-white/10 ${colorMode === "colour" ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10"}`}><span className="text-sm text-white">Colour</span><span className="h-3 w-3 rounded-sm bg-gradient-to-br from-rose-400 via-amber-300 to-sky-400" /></button>{PALETTES.map((option) => <button key={option.id} type="button" onClick={() => { setPalette(option.id); setColorMode("monochrome"); }} className={`flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left transition hover:bg-white/10 ${colorMode === "monochrome" && palette === option.id ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10"}`}><span className="text-sm text-white">{option.name}</span><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: option.foreground }} /></button>)}{colorMode === "colour" ? <div className="border-t border-white/10 pt-3"><div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500"><span>Image colours</span><span>{colorCount === 0 ? "Full" : colorCount}</span></div><div className="grid grid-cols-5 gap-1">{COLOR_COUNTS.map((count) => <button key={count} type="button" onClick={() => setColorCount(count)} className={`rounded-sm border px-1 py-2 text-xs transition hover:bg-white/10 ${colorCount === count ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-400"}`}>{count === 0 ? "Full" : count}</button>)}</div></div> : null}</div>
          </> : null}
          <div className="rounded-md border border-white/10 bg-black/40 p-3 text-sm text-slate-300"><div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">Stats</div><div className="flex justify-between"><span>Characters</span><span>{characterSetDisplay.length}</span></div><div className="mt-2 flex justify-between"><span>Columns</span><span>{generatedArt?.columns || resolutionColumns}</span></div><div className="mt-2 flex justify-between"><span>Shortcuts</span><span className="font-mono text-xs">U upload · C copy · R reset</span></div></div>
        </aside>
      </div>
    </div>
  </main>;
}
