"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { HalftoneLogo } from "@/components/HalftoneLogo";
import {
  CHARACTER_SETS,
  COLOR_COUNTS,
  DEFAULT_BACKGROUND_SEPARATION,
  DEFAULT_IMAGE_ADJUSTMENTS,
  DITHER_ALGORITHMS,
  DITHER_METADATA,
  PALETTES,
  RENDER_MODES,
  type ArtOptions,
  type BackgroundCharacterSetId,
  type BackgroundSeparationOptions,
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
import { paintBackground, parseBackgroundColour, type Background } from "@/lib/background";
import type { ColourTreatment } from "@/lib/colourTreatment";
import { CUSTOM_TEXT_STYLES, TEXT_OUTPUT_FORMATS, type TextOutputFormat, formatGeneratedTextOutput, generateCustomTextArt } from "@/lib/customText";
import { DEFAULT_FIGLET_COLOUR_SETTINGS, FIGLET_COLOUR_STYLES, applyFigletColours, getFigletBackground, type FigletColourSettings } from "@/lib/textColour";
import { ASPECT_PRESETS, type CropPosition, type FitMode } from "@/lib/renderer/sampling";
import { IMAGE_PRESETS, type ImagePreset } from "@/lib/imagePresets";

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

const BACKGROUND_CHARACTER_SET_OPTIONS: Array<{ id: BackgroundCharacterSetId; label: string; sample: string }> = [
  { id: "ascii", label: "ASCII", sample: "@#%*+=-:." },
  { id: "blocks", label: "Blocks", sample: "█▓▒░" },
  { id: "unicode", label: "Unicode Dense", sample: "▁▂▃▄▅▆▇█" },
  { id: "unicodeFine", label: "Unicode Fine", sample: "@#WMW$B8&" },
  { id: "binary", label: "Binary", sample: "01" },
  { id: "matrix", label: "Matrix", sample: "ｱｲｳｴｵ0123" },
  { id: "symbols", label: "Symbols", sample: "!<>/\\|[]{}()" },
];

const DITHER_LABELS: Record<DitherAlgorithm, string> = {
  none: "None",
  bayer2: "Bayer 2 × 2",
  bayer4: "Bayer 4 × 4",
  bayer8: "Bayer 8 × 8",
  "blue-noise": "Blue noise",
  "floyd-steinberg": "Floyd–Steinberg",
  atkinson: "Atkinson",
  "sierra-lite": "Sierra Lite",
};

const DITHER_GROUPS = [
  { id: "ordered", label: "Ordered" },
  { id: "diffusion", label: "Error diffusion" },
  { id: "noise", label: "Noise" },
] as const;

function DitherOptions() {
  return <>
    <option value="none">{DITHER_LABELS.none}</option>
    {DITHER_GROUPS.map((group) => <optgroup key={group.id} label={group.label}>{DITHER_ALGORITHMS.filter((algorithm) => DITHER_METADATA[algorithm].group === group.id).map((algorithm) => <option key={algorithm} value={algorithm}>{DITHER_LABELS[algorithm]}</option>)}</optgroup>)}
  </>;
}

const RENDER_LABELS: Record<RenderMode, string> = { density: "Density", edge: "Edge", "edge-direction": "Directional edges", hybrid: "Hybrid" };
const RESOLUTION_MIN = 48;
const RESOLUTION_MAX = 240;
const RESOLUTION_STEP = 4;
const RESOLUTION_MARKS = [48, 80, 112, 144, 176, 208, 240] as const;
const USAGE_ENDPOINT = "/api/uses";
const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  const compareButtonRef = useRef<HTMLButtonElement>(null);
  const compareCloseRef = useRef<HTMLButtonElement>(null);
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
  const [aspectFactor, setAspectFactor] = useState(0.6);
  const [fitMode, setFitMode] = useState<FitMode>("stretch");
  const [cropPosition, setCropPosition] = useState<CropPosition>("center");
  const [invert, setInvert] = useState(true);
  const [palette, setPalette] = useState<PaletteId>("bw");
  const [sidebarWidth, setSidebarWidth] = useState(292);
  const [mobileTab, setMobileTab] = useState<"controls" | "preview" | "export">("preview");
  const [colorMode, setColorMode] = useState<ColorMode>("colour");
  const [colorCount, setColorCount] = useState<ColorCount>(0);
  const [colourTreatment, setColourTreatment] = useState<ColourTreatment>({ kind: "source" });
  const [ditherAlgorithm, setDitherAlgorithm] = useState<DitherAlgorithm>("none");
  const [renderMode, setRenderMode] = useState<RenderMode>("density");
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_IMAGE_ADJUSTMENTS);
  const [backgroundSeparation, setBackgroundSeparation] = useState<BackgroundSeparationOptions>(DEFAULT_BACKGROUND_SEPARATION);
  const [imageBackground, setImageBackground] = useState<Background>({ kind: "solid", colour: "#070b14" });
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
  const [showDitherCompare, setShowDitherCompare] = useState(false);
  const [compareAlgorithms, setCompareAlgorithms] = useState<DitherAlgorithm[]>(["none", "bayer4", "floyd-steinberg", "blue-noise"]);
  const [comparisonArts, setComparisonArts] = useState<Array<{ algorithm: DitherAlgorithm; art: GeneratedArt }>>([]);
  const [isComparing, setIsComparing] = useState(false);

  const activeTextStyle = CUSTOM_TEXT_STYLES[textStyleIndex] ?? CUSTOM_TEXT_STYLES[0];
  const activePalette = useMemo(() => PALETTES.find((option) => option.id === palette) ?? PALETTES[0], [palette]);
  const colouredTextArt = useMemo(() => mode === "text" && generatedArt ? applyFigletColours(generatedArt, figletColourSettings) : null, [figletColourSettings, generatedArt, mode]);
  const displayArt = useMemo(() => mode === "text" && colouredTextArt ? formatGeneratedTextOutput(colouredTextArt, textOutputFormat) : generatedArt, [colouredTextArt, generatedArt, mode, textOutputFormat]);
  const artLines = useMemo(() => displayArt?.lines ?? [], [displayArt]);
  const previewColumns = Math.max(...artLines.map((line) => line.length), 0);
  const textBackground = useMemo(() => getFigletBackground(figletColourSettings), [figletColourSettings]);
  const exportName = mode === "text" ? textValue.trim().toLowerCase().replace(/\s+/g, "-") || "text-art" : "halftone";
  const previewAspect = useMemo(() => generatedArt ? canvasMetrics(generatedArt).width / canvasMetrics(generatedArt).height : 1.5, [generatedArt]);
  const currentImageOptions = useMemo<ArtOptions>(() => ({ columns: resolutionColumns, aspectFactor, fitMode, cropPosition, characterSet, customText: customGlyphs, invert, palette, colorMode, colorCount, colourTreatment, ditherAlgorithm, renderMode, adjustments, backgroundSeparation, background: imageBackground }), [adjustments, aspectFactor, backgroundSeparation, characterSet, colorCount, colorMode, colourTreatment, cropPosition, customGlyphs, ditherAlgorithm, fitMode, imageBackground, invert, palette, renderMode, resolutionColumns]);

  const incrementUsage = useCallback(async () => {
    try {
      const response = await fetch(USAGE_ENDPOINT, { method: "POST" });
      const data = response.ok ? await response.json() as { count?: number } : null;
      const count = data?.count;
      if (typeof count === "number") setRenderCount((current) => Math.max(current, count));
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
    image.onload = () => { imageRef.current = image; setImageReady(true); setStatus("Image loaded. Tune the live renderer below."); };
    image.onerror = () => { setStatus("That file could not be loaded as an image."); setImageReady(false); };
    image.src = url;
  }, []);

  const drawGeneratedArt = useCallback((generated: GeneratedArt) => {
    const canvas = previewCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) throw new Error("Canvas 2D context is unavailable.");
    const metrics = canvasMetrics(generated);
    canvas.width = metrics.width;
    canvas.height = metrics.height;
    paintBackground(context, canvas.width, canvas.height, generated.background);
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
      const options: ArtOptions = { ...currentImageOptions, background: mode === "image" ? imageBackground : undefined };
      const generated = mode === "text" ? generateCustomTextArt(textValue, activeTextStyle) : await generateArtFromImage(imageRef.current as HTMLImageElement, options);
      setGeneratedArt(generated);
      if (mode === "image") drawGeneratedArt(generated);
      setStatus(`Rendered ${generated.columns} × ${generated.rows} characters.`);
      void incrementUsage();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to render the preview.");
    } finally { setIsRendering(false); }
  }, [activeTextStyle, currentImageOptions, drawGeneratedArt, imageBackground, incrementUsage, mode, textValue]);

  const renderDitherComparison = useCallback(async () => {
    if (!imageRef.current || !compareAlgorithms.length) return;
    setIsComparing(true);
    try {
      const variants = await Promise.all(compareAlgorithms.map(async (algorithm) => ({
        algorithm,
        art: await generateArtFromImage(imageRef.current as HTMLImageElement, { ...currentImageOptions, ditherAlgorithm: algorithm }),
      })));
      setComparisonArts(variants);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not render the dither comparison.");
    } finally {
      setIsComparing(false);
    }
  }, [compareAlgorithms, currentImageOptions]);

  const updateAdjustment = useCallback((key: keyof ImageAdjustments, value: number) => setAdjustments((current) => ({ ...current, [key]: value })), []);

  const resetImageSettings = useCallback(() => {
    setCharacterSet("ascii");
    setResolutionColumns(84);
    setAspectFactor(0.6);
    setFitMode("stretch");
    setCropPosition("center");
    setInvert(true);
    setPalette("bw");
    setColorMode("colour");
    setColorCount(0);
    setColourTreatment({ kind: "source" });
    setDitherAlgorithm("none");
    setRenderMode("density");
    setAdjustments(DEFAULT_IMAGE_ADJUSTMENTS);
    setBackgroundSeparation(DEFAULT_BACKGROUND_SEPARATION);
    setImageBackground({ kind: "solid", colour: "#070b14" });
    setStatus("Image settings reset to the accuracy-first default.");
  }, []);

  const switchMode = useCallback((nextMode: "image" | "text") => {
    setMode(nextMode);
    if (nextMode === "image") {
      setGeneratedArt(null);
      setShowComparison(false);
      setStatus(imageRef.current ? "Restoring the image renderer." : "Choose an image or switch back to text.");
    }
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
      const count = data?.count;
      if (!cancelled && typeof count === "number") setRenderCount((current) => Math.max(current, count));
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
    if (showDitherCompare) void renderDitherComparison();
  }, [renderDitherComparison, showDitherCompare]);

  useEffect(() => {
    if (!showDitherCompare) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowDitherCompare(false);
    };
    window.addEventListener("keydown", onKeyDown);
    compareCloseRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDitherCompare]);

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
      if (params.get("v") !== "2" && params.get("v") !== "3") {
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
      const queryTreatment = params.get("treatment");
      const queryBackgroundSet = params.get("backgroundSet") as BackgroundCharacterSetId | null;
      const queryBackgroundType = params.get("backgroundType");
      const queryGlyphs = params.get("glyphs");
      if (queryCharacterSet && (queryCharacterSet === "custom" || queryCharacterSet in CHARACTER_SETS)) setCharacterSet(queryCharacterSet);
      if (queryGlyphs !== null) setCustomGlyphs(queryGlyphs);
      if (queryDither && DITHER_ALGORITHMS.includes(queryDither)) setDitherAlgorithm(queryDither);
      if (queryMode && RENDER_MODES.includes(queryMode)) setRenderMode(queryMode);
      if (queryPalette && PALETTES.some((item) => item.id === queryPalette)) setPalette(queryPalette);
      if (queryBackgroundSet && BACKGROUND_CHARACTER_SET_OPTIONS.some((item) => item.id === queryBackgroundSet)) {
        setBackgroundSeparation((current) => ({ ...current, characterSet: queryBackgroundSet }));
      }
      setResolutionColumns(Math.min(RESOLUTION_MAX, Math.max(RESOLUTION_MIN, numeric("res", resolutionColumns))));
      setAspectFactor(clampNumber(numeric("aspect", 0.6), 0.25, 2));
      const queryFit = params.get("fit") as FitMode | null;
      if (queryFit === "contain" || queryFit === "cover" || queryFit === "stretch") setFitMode(queryFit);
      const queryCrop = params.get("crop") as CropPosition | null;
      if (queryCrop && ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"].includes(queryCrop)) setCropPosition(queryCrop);
      setInvert(params.get("invert") !== "0");
      setColorMode(params.get("colour") === "mono" ? "monochrome" : "colour");
      const queryColorCount = COLOR_COUNTS.includes(numeric("colors", colorCount) as ColorCount) ? numeric("colors", colorCount) as ColorCount : colorCount;
      setColorCount(queryColorCount);
      if (queryTreatment === "monochrome") setColourTreatment({ kind: "monochrome", colour: parseBackgroundColour(params.get("treatmentColour"), "#e8edf2") });
      else if (queryTreatment === "palette") setColourTreatment({ kind: "palette", count: queryColorCount || 4 });
      else if (queryTreatment === "duotone") setColourTreatment({ kind: "duotone", shadowColour: parseBackgroundColour(params.get("shadow"), "#101820"), highlightColour: parseBackgroundColour(params.get("highlight"), "#f5f7fa") });
      else if (queryTreatment === "gradient-map") {
        const stops = (params.get("stops") ?? "").split(",").filter((stop) => /^#[\da-f]{6}$/iu.test(stop));
        setColourTreatment({ kind: "gradient-map", stops: stops.length >= 2 ? stops.slice(0, 4) : ["#101820", "#f5f7fa"] });
      } else if (params.get("colour") === "mono") {
        setColourTreatment({ kind: "monochrome", colour: PALETTES.find((item) => item.id === (queryPalette ?? palette))?.foreground ?? "#e8edf2" });
      } else if (queryColorCount > 0) {
        setColourTreatment({ kind: "palette", count: queryColorCount });
      } else setColourTreatment({ kind: "source" });
      setAdjustments({ brightness: numeric("bright", 0), contrast: numeric("contrast", 0), gamma: numeric("gamma", 1), saturation: numeric("sat", 1), threshold: numeric("threshold", 0), ditherStrength: numeric("strength", 1), toneLevels: numeric("levels", 0), preBlur: numeric("preblur", DEFAULT_IMAGE_ADJUSTMENTS.preBlur), sharpness: numeric("sharp", 0), blur: numeric("blur", 0), grain: clampNumber(numeric("grain", 0), 0, 1), grainSeed: Math.round(numeric("grainSeed", 0)) });
      setBackgroundSeparation((current) => ({
        ...current,
        enabled: params.get("background") === "1",
        colour: /^#[\da-f]{6}$/iu.test(params.get("backgroundColour") ?? "") ? params.get("backgroundColour") ?? current.colour : current.colour,
        threshold: clampNumber(numeric("backgroundThreshold", current.threshold), 0.05, 0.95),
        softness: clampNumber(numeric("backgroundSoftness", current.softness), 0.02, 0.45),
      }));
      const startColour = parseBackgroundColour(params.get("backgroundStart"), "#070b14");
      const endColour = parseBackgroundColour(params.get("backgroundEnd"), "#070b14");
      if (queryBackgroundType === "transparent") setImageBackground({ kind: "transparent" });
      else if (queryBackgroundType === "linear") setImageBackground({ kind: "linear", startColour, endColour, angle: numeric("backgroundAngle", 0) });
      else if (queryBackgroundType === "radial") setImageBackground({ kind: "radial", innerColour: startColour, outerColour: endColour, centerX: numeric("backgroundX", 0.5), centerY: numeric("backgroundY", 0.5), spread: numeric("backgroundSpread", 1) });
      else setImageBackground({ kind: "solid", colour: parseBackgroundColour(params.get("backgroundColour"), "#070b14") });
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
    params.set("v", "3");
    params.set("res", String(resolutionColumns));
    params.set("aspect", String(aspectFactor));
    params.set("fit", fitMode);
    params.set("crop", cropPosition);
    params.set("set", characterSet);
    params.set("glyphs", customGlyphs);
    params.set("dither", ditherAlgorithm);
    params.set("render", renderMode);
    params.set("invert", invert ? "1" : "0");
    params.set("palette", palette);
    params.set("colour", colorMode === "colour" ? "colour" : "mono");
    params.set("colors", String(colorCount));
    params.set("treatment", colourTreatment.kind);
    if (colourTreatment.kind === "monochrome") params.set("treatmentColour", colourTreatment.colour);
    if (colourTreatment.kind === "palette") params.set("colors", String(colourTreatment.count));
    if (colourTreatment.kind === "duotone") {
      params.set("shadow", colourTreatment.shadowColour);
      params.set("highlight", colourTreatment.highlightColour);
    }
    if (colourTreatment.kind === "gradient-map") params.set("stops", colourTreatment.stops.join(","));
    params.set("background", backgroundSeparation.enabled ? "1" : "0");
    params.set("backgroundSet", backgroundSeparation.characterSet);
    params.set("backgroundColour", backgroundSeparation.colour);
    params.set("backgroundThreshold", String(backgroundSeparation.threshold));
    params.set("backgroundSoftness", String(backgroundSeparation.softness));
    params.set("backgroundType", imageBackground.kind);
    if (imageBackground.kind === "solid") params.set("backgroundColour", imageBackground.colour);
    if (imageBackground.kind === "linear") {
      params.set("backgroundStart", imageBackground.startColour);
      params.set("backgroundEnd", imageBackground.endColour);
      params.set("backgroundAngle", String(imageBackground.angle));
    }
    if (imageBackground.kind === "radial") {
      params.set("backgroundStart", imageBackground.innerColour);
      params.set("backgroundEnd", imageBackground.outerColour);
      params.set("backgroundX", String(imageBackground.centerX));
      params.set("backgroundY", String(imageBackground.centerY));
      params.set("backgroundSpread", String(imageBackground.spread));
    }
    params.set("bright", String(adjustments.brightness));
    params.set("contrast", String(adjustments.contrast));
    params.set("gamma", String(adjustments.gamma));
    params.set("sat", String(adjustments.saturation));
    params.set("threshold", String(adjustments.threshold));
    params.set("strength", String(adjustments.ditherStrength));
    params.set("levels", String(adjustments.toneLevels));
    params.set("preblur", String(adjustments.preBlur));
    params.set("sharp", String(adjustments.sharpness));
    params.set("blur", String(adjustments.blur));
    params.set("grain", String(adjustments.grain ?? 0));
    params.set("grainSeed", String(Math.round(adjustments.grainSeed ?? 0)));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [adjustments, aspectFactor, backgroundSeparation, characterSet, colorCount, colorMode, colourTreatment, cropPosition, customGlyphs, ditherAlgorithm, fitMode, imageBackground, invert, palette, renderMode, resolutionColumns]);

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
  const applyPreset = (preset: ImagePreset) => {
    setResolutionColumns(preset.columns);
    setCharacterSet(preset.characterSet);
    setDitherAlgorithm(preset.dither);
    setRenderMode(preset.renderMode);
    setInvert(preset.invert);
    setPalette(preset.palette);
    setColorMode(preset.colorMode);
    setColorCount(preset.colorCount);
    setColourTreatment(preset.colourTreatment);
    setAdjustments({ ...preset.adjustments });
    setBackgroundSeparation({ ...preset.backgroundSeparation });
    setImageBackground(preset.background);
    setAspectFactor(preset.aspectFactor);
    setFitMode(preset.fitMode);
    setCropPosition(preset.cropPosition);
    setGeneratedArt(null);
    setShowDitherCompare(false);
    setStatus(`${preset.name} preset applied.`);
  };

  const exportText = () => download(`${exportName}.txt`, artLines.join("\n"), "text/plain;charset=utf-8");
  const exportPng = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => { if (blob) download(`${exportName}.png`, blob, "image/png"); }, "image/png");
  };

  return <main className="min-h-screen bg-black text-slate-100">
    <div className="mx-auto flex min-h-screen w-full max-w-none flex-col gap-4 px-3 py-3 sm:px-4 lg:px-8">
      <header className="border-b border-white/10 pb-3">
        <div className="flex justify-end pb-2"><span className="rounded-sm border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">{renderCount.toLocaleString()} generations</span></div>
        <HalftoneLogo />
      </header>

      {/* Mobile Tab Switcher */}
      <div className="flex xl:hidden border border-white/10 rounded-md bg-black/40 p-1">
        {[
          { id: "controls", label: "Controls" },
          { id: "preview", label: "Preview" },
          { id: "export", label: "Export" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileTab(tab.id as any)}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-sm transition ${
              mobileTab === tab.id
                ? "bg-emerald-300 text-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="grid flex-1 gap-4 xl:grid-cols-[var(--sidebar-width)_minmax(0,1fr)_var(--sidebar-width)]"
        style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
      >
        <section className={`space-y-3 rounded-md border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm ${
          mobileTab === "controls" ? "block" : "hidden xl:block"
        }`}>
          <div className={`rounded-md border border-dashed p-3 transition ${isDragging ? "border-emerald-300 bg-emerald-300/10" : "border-white/15 bg-black/40"}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files.item(0); if (file) loadFile(file); }}>
            <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) loadFile(file); }} />
            <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Upload image</p><p className="mt-1 text-xs text-slate-500">Drop, browse, or paste.</p></div><button type="button" onClick={() => inputRef.current?.click()} className="rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:-translate-y-px hover:bg-white/10 active:translate-y-0">Browse</button></div>
          </div>

          <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Create from</h2>
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => switchMode("image")} className={`rounded-sm border px-3 py-2 text-sm transition hover:bg-white/10 ${mode === "image" ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-300"}`}>Image</button><button type="button" onClick={() => switchMode("text")} className={`rounded-sm border px-3 py-2 text-sm transition hover:bg-white/10 ${mode === "text" ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-300"}`}>Text</button></div>
            {mode === "text" ? <><textarea value={textValue} onChange={(event) => setTextValue(event.target.value)} rows={2} className="w-full rounded-sm border border-white/10 bg-black/70 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-300/40" placeholder="HELLO" /><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Text style<select value={textStyleIndex} onChange={(event) => setTextStyleIndex(Number(event.target.value))} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{CUSTOM_TEXT_STYLES.map((style, index) => <option key={style.id} value={index}>{style.name}</option>)}</select></label><div className="space-y-3 border-t border-white/10 pt-3"><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Colour treatment<select value={figletColourSettings.style} onChange={(event) => updateFigletColour("style", event.target.value as FigletColourSettings["style"])} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{FIGLET_COLOUR_STYLES.map((style) => <option key={style.id} value={style.id}>{style.name}</option>)}</select></label>{figletColourSettings.style === "solid" ? <label className="flex items-center justify-between text-xs text-slate-300"><span>Solid colour</span><input aria-label="Solid text colour" type="color" value={figletColourSettings.solid} onChange={(event) => updateFigletColour("solid", event.target.value)} className="h-8 w-10 rounded-sm border border-white/10 bg-black p-1" /></label> : null}{figletColourSettings.style === "horizontal" || figletColourSettings.style === "vertical" ? <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">Start<input aria-label="Gradient start colour" type="color" value={figletColourSettings.gradientStart} onChange={(event) => updateFigletColour("gradientStart", event.target.value)} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label><label className="text-xs text-slate-300">End<input aria-label="Gradient end colour" type="color" value={figletColourSettings.gradientEnd} onChange={(event) => updateFigletColour("gradientEnd", event.target.value)} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label></div> : null}{figletColourSettings.style === "custom" ? <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">First colour<input aria-label="Custom gradient first colour" type="color" value={figletColourSettings.customStart} onChange={(event) => updateFigletColour("customStart", event.target.value)} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label><label className="text-xs text-slate-300">Second colour<input aria-label="Custom gradient second colour" type="color" value={figletColourSettings.customEnd} onChange={(event) => updateFigletColour("customEnd", event.target.value)} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label></div> : null}<label className="flex items-center justify-between text-xs text-slate-300"><span>Include background</span><input aria-label="Include background colour" type="checkbox" checked={figletColourSettings.includeBackground} onChange={(event) => updateFigletColour("includeBackground", event.target.checked)} className="h-4 w-4 accent-emerald-300" /></label>{figletColourSettings.includeBackground && figletColourSettings.style !== "terminal" && figletColourSettings.style !== "amber" ? <label className="flex items-center justify-between text-xs text-slate-300"><span>Background colour</span><input aria-label="Text background colour" type="color" value={figletColourSettings.background} onChange={(event) => updateFigletColour("background", event.target.value)} className="h-8 w-10 rounded-sm border border-white/10 bg-black p-1" /></label> : null}<RangeControl label="Line height" value={figletColourSettings.lineHeight} min={0.75} max={1.6} step={0.05} onChange={(value) => updateFigletColour("lineHeight", value)} format={(value) => value.toFixed(2)} /></div></> : null}
          </div>

          {mode === "image" ? <>
            <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Presets</h2><div className="grid gap-1.5">{IMAGE_PRESETS.map((preset) => <button key={preset.id} type="button" title={preset.description} onClick={() => applyPreset(preset)} className="rounded-sm border border-white/10 px-3 py-2 text-left transition hover:-translate-y-px hover:border-emerald-300/40 hover:bg-emerald-300/10 active:translate-y-0"><span className="block text-sm text-white">{preset.name}</span><span className="block text-[10px] text-slate-500">{preset.description}</span></button>)}</div></div>
            <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Character set</h2><select value={characterSet} onChange={(event) => setCharacterSet(event.target.value as CharacterSetId)} className="w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/40">{CHARACTER_SET_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><p className="font-mono text-[10px] text-slate-500">{CHARACTER_SET_OPTIONS.find((option) => option.id === characterSet)?.sample}</p>{characterSet === "custom" ? <textarea value={customGlyphs} onChange={(event) => setCustomGlyphs(event.target.value)} rows={2} className="w-full rounded-sm border border-white/10 bg-black/70 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-300/40" placeholder="@#%" /> : null}<p className="text-xs text-slate-500">Generic and custom sets are ordered by measured glyph density.</p></div>
            <div className="space-y-3 rounded-md border border-white/10 bg-black/40 p-3"><div className="flex items-start justify-between gap-3"><div><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Foreground / background</h2><p className="mt-1 text-xs text-slate-500">Keep the subject detailed while the background becomes quieter.</p></div><button type="button" onClick={() => setBackgroundSeparation((current) => ({ ...current, enabled: !current.enabled }))} className={`h-7 w-12 shrink-0 rounded-sm border transition ${backgroundSeparation.enabled ? "border-emerald-300/40 bg-emerald-300/20" : "border-white/10 bg-white/10"}`} aria-label="Separate foreground and background" aria-pressed={backgroundSeparation.enabled}><span className={`block h-4 w-4 rounded-sm bg-white transition ${backgroundSeparation.enabled ? "translate-x-6" : "translate-x-1"}`} /></button></div>{backgroundSeparation.enabled ? <div className="space-y-3 border-t border-white/[0.07] pt-3"><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Background glyphs<select value={backgroundSeparation.characterSet} onChange={(event) => setBackgroundSeparation((current) => ({ ...current, characterSet: event.target.value as BackgroundCharacterSetId }))} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{BACKGROUND_CHARACTER_SET_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="flex items-center justify-between text-xs text-slate-300"><span>Background tint</span><input aria-label="Background tint" type="color" value={backgroundSeparation.colour} onChange={(event) => setBackgroundSeparation((current) => ({ ...current, colour: event.target.value }))} className="h-8 w-10 rounded-sm border border-white/10 bg-black p-1" /></label><RangeControl label="Subject separation" value={backgroundSeparation.threshold} min={0.05} max={0.95} step={0.05} onChange={(value) => setBackgroundSeparation((current) => ({ ...current, threshold: value }))} format={(value) => `${Math.round(value * 100)}%`} /><RangeControl label="Edge blend" value={backgroundSeparation.softness} min={0.02} max={0.45} step={0.01} onChange={(value) => setBackgroundSeparation((current) => ({ ...current, softness: value }))} format={(value) => `${Math.round(value * 100)}%`} /></div> : null}</div>
            <div className="space-y-3 rounded-md border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Background</h2><select aria-label="Image background type" value={imageBackground.kind} onChange={(event) => { const kind = event.target.value as Background["kind"]; setImageBackground(kind === "transparent" ? { kind } : kind === "solid" ? { kind, colour: activePalette.background } : kind === "linear" ? { kind, startColour: activePalette.background, endColour: "#243b53", angle: 0 } : { kind, innerColour: activePalette.background, outerColour: "#000000", centerX: 0.5, centerY: 0.5, spread: 1 }); }} className="w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/40"><option value="solid">Solid</option><option value="linear">Linear gradient</option><option value="radial">Radial gradient</option><option value="transparent">Transparent</option></select>{imageBackground.kind === "solid" ? <label className="flex items-center justify-between text-xs text-slate-300"><span>Colour</span><input aria-label="Background colour" type="color" value={imageBackground.colour} onChange={(event) => setImageBackground({ kind: "solid", colour: event.target.value })} className="h-8 w-10 rounded-sm border border-white/10 bg-black p-1" /></label> : null}{imageBackground.kind === "linear" ? <><div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">Start<input aria-label="Background gradient start" type="color" value={imageBackground.startColour} onChange={(event) => setImageBackground({ ...imageBackground, startColour: event.target.value })} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label><label className="text-xs text-slate-300">End<input aria-label="Background gradient end" type="color" value={imageBackground.endColour} onChange={(event) => setImageBackground({ ...imageBackground, endColour: event.target.value })} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label></div><label className="block text-xs text-slate-300">Angle<select aria-label="Background gradient angle" value={imageBackground.angle} onChange={(event) => setImageBackground({ ...imageBackground, angle: Number(event.target.value) })} className="mt-1 w-full rounded-sm border border-white/10 bg-black px-2 py-1 text-sm"><option value={0}>Horizontal</option><option value={90}>Vertical</option><option value={45}>Diagonal down-right</option><option value={315}>Diagonal up-right</option></select></label></> : null}{imageBackground.kind === "radial" ? <><div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">Inner<input aria-label="Radial inner colour" type="color" value={imageBackground.innerColour} onChange={(event) => setImageBackground({ ...imageBackground, innerColour: event.target.value })} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label><label className="text-xs text-slate-300">Outer<input aria-label="Radial outer colour" type="color" value={imageBackground.outerColour} onChange={(event) => setImageBackground({ ...imageBackground, outerColour: event.target.value })} className="mt-1 h-8 w-full rounded-sm border border-white/10 bg-black p-1" /></label></div><RangeControl label="Centre X" value={imageBackground.centerX} min={0} max={1} step={0.05} onChange={(value) => setImageBackground({ ...imageBackground, centerX: value })} format={(value) => `${Math.round(value * 100)}%`} /><RangeControl label="Centre Y" value={imageBackground.centerY} min={0} max={1} step={0.05} onChange={(value) => setImageBackground({ ...imageBackground, centerY: value })} format={(value) => `${Math.round(value * 100)}%`} /><RangeControl label="Spread" value={imageBackground.spread} min={0.25} max={2} step={0.05} onChange={(value) => setImageBackground({ ...imageBackground, spread: value })} format={(value) => `${Math.round(value * 100)}%`} /></> : null}</div>
            <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3"><div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-slate-500"><span>Resolution</span><span>{resolutionColumns} columns</span></div><div className="relative"><input type="range" min={RESOLUTION_MIN} max={RESOLUTION_MAX} step={RESOLUTION_STEP} value={resolutionColumns} onChange={(event) => setResolutionColumns(Number(event.target.value))} className="h-2 w-full accent-emerald-300" /><div aria-hidden className="pointer-events-none absolute inset-x-1 top-1/2 flex -translate-y-1/2 justify-between">{RESOLUTION_MARKS.map((mark) => <span key={mark} className={`h-1.5 w-1.5 rounded-sm ${resolutionColumns >= mark ? "bg-emerald-200" : "bg-slate-600"}`} />)}</div></div><div className="flex justify-between text-[9px] uppercase text-slate-500">{RESOLUTION_MARKS.map((mark) => <span key={mark}>{mark}</span>)}</div></div>
            <button type="button" onClick={resetImageSettings} className="w-full rounded-sm border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:-translate-y-px hover:border-white/30 hover:bg-white/10 active:translate-y-0">Reset image settings <span className="text-slate-500">R</span></button>
          </> : null}
        </section>

        <section className={`flex min-h-[72vh] flex-col rounded-md border border-white/10 bg-black/60 p-3 ${
          mobileTab === "preview" ? "flex" : "hidden xl:flex"
        }`}>
          <div className="mb-3 flex justify-between px-1 text-[10px] uppercase tracking-[0.3em] text-slate-500"><span>{mode === "text" ? "ASCII output" : "Preview"}</span><span>{artLines.length ? `${previewColumns} × ${artLines.length}` : "waiting"}</span></div>
          {mode === "text" ? <pre style={{ backgroundColor: textBackground ?? "transparent", lineHeight: figletColourSettings.lineHeight }} className="min-h-0 flex-1 overflow-auto rounded-md border border-white/10 p-5 font-mono text-[10px]">{displayArt ? displayArt.lines.map((line, row) => <Fragment key={`${row}-${line}`}><ColouredFigletLine line={line} colors={displayArt.colors[row] ?? []} fallback={displayArt.foreground} row={row} />{row < displayArt.lines.length - 1 ? "\n" : null}</Fragment>) : "Type text to generate an ASCII banner."}</pre> : <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md border border-white/10 bg-black p-2"><div className="relative w-full" style={{ aspectRatio: previewAspect }}><canvas ref={previewCanvasRef} className={artLines.length ? "absolute inset-0 h-full w-full" : "hidden"} />{showComparison && imageUrl && artLines.length ? <div className="absolute inset-y-0 left-0 overflow-hidden border-r border-emerald-200/70" style={{ width: `${comparisonPosition}%` }}>{/* Blob URLs are local, user-supplied images and intentionally bypass Next image optimisation. */}<img src={imageUrl} alt="Original image comparison" className="h-full w-full object-fill" /></div> : null}{!artLines.length ? <p className="absolute inset-0 grid place-items-center font-mono text-[10px] uppercase tracking-[0.26em] text-slate-500">drop image</p> : null}{isRendering ? <div className="absolute inset-0 grid place-items-center bg-black/55 text-[10px] uppercase tracking-[0.3em] text-emerald-200">Rendering</div> : null}</div></div>}
          {mode === "image" && artLines.length ? <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3"><button type="button" onClick={() => setShowComparison((current) => !current)} className={`rounded-sm border px-3 py-1.5 text-xs transition hover:bg-white/10 ${showComparison ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-300"}`}>{showComparison ? "Hide before" : "Compare before"}</button>{showComparison ? <label className="flex flex-1 items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500"><span>Before</span><input aria-label="Before and after comparison position" type="range" min="0" max="100" value={comparisonPosition} onChange={(event) => setComparisonPosition(Number(event.target.value))} className="h-1.5 flex-1 accent-emerald-300" /><span>After</span></label> : null}</div> : null}
          <p className="mt-2 text-xs text-slate-500">{status}</p>
        </section>

        <aside className={`space-y-3 rounded-md border border-white/10 bg-white/[0.03] p-3 ${
          mobileTab === "export" ? "block" : "hidden xl:block"
        }`}>
          <div className="space-y-3 rounded-md border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Export</h2><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Text wrapper<select value={textOutputFormat} onChange={(event) => setTextOutputFormat(event.target.value as TextOutputFormat["id"])} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{TEXT_OUTPUT_FORMATS.map((format) => <option key={format.id} value={format.id}>{format.name}</option>)}</select></label><p className="text-xs text-slate-500">The wrapper affects text previews, copied text, and TXT exports.</p><div className="grid grid-cols-2 gap-2"><button type="button" disabled={!artLines.length} onClick={() => void copyText()} className="rounded-sm border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40">{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy text"}</button><button type="button" disabled={!artLines.length} onClick={exportText} className="rounded-sm border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40">TXT</button>{mode === "image" ? <button type="button" disabled={!artLines.length} onClick={exportPng} className="rounded-sm bg-emerald-300 px-3 py-2 text-sm font-semibold text-black transition hover:bg-emerald-200 disabled:opacity-40">PNG</button> : null}<button type="button" disabled={!displayArt} onClick={() => displayArt && download(`${exportName}.svg`, generateSvgExport(displayArt), "image/svg+xml;charset=utf-8")} className="rounded-sm border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40">SVG</button><button type="button" disabled={!displayArt} onClick={() => displayArt && download(`${exportName}.html`, generateHtmlExport(displayArt, mode === "text" ? textHtmlOptions : undefined), "text/html;charset=utf-8")} className="rounded-sm border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40">HTML</button>{mode === "text" ? <button type="button" disabled={!displayArt} onClick={() => void copyHtml()} className="rounded-sm border border-emerald-300/30 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-300/10 disabled:opacity-40">{htmlCopyState === "copied" ? "HTML copied" : htmlCopyState === "failed" ? "HTML failed" : "Copy HTML"}</button> : null}<button type="button" disabled={!displayArt} onClick={() => displayArt && download(`${exportName}.ansi`, generateAnsiExport(displayArt), "text/plain;charset=utf-8")} className="rounded-sm border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40">ANSI</button></div><p className="text-xs text-slate-500">HTML, SVG, and ANSI retain the displayed per-character colour.</p></div>

          {mode === "image" ? <>
          <div className="space-y-3 rounded-md border border-white/10 bg-black/40 p-3"><div className="flex items-center justify-between"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Renderer</h2><button type="button" title="Copy this configuration from the address bar" onClick={() => { void navigator.clipboard.writeText(window.location.href); setStatus("Shareable settings URL copied."); }} className="text-[10px] uppercase tracking-[0.18em] text-emerald-200 transition hover:text-emerald-100">Copy link</button></div><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Dithering<select aria-label="Dithering" value={ditherAlgorithm} onChange={(event) => setDitherAlgorithm(event.target.value as DitherAlgorithm)} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40"><DitherOptions /></select></label><p aria-live="polite" className="mt-1 text-xs text-slate-500">{DITHER_METADATA[ditherAlgorithm].description}</p><div className="flex items-center justify-between gap-2"><span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Diagnostic view</span><button ref={compareButtonRef} type="button" disabled={!imageReady} onClick={() => setShowDitherCompare(true)} className="rounded-sm border border-emerald-300/30 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-300/10 disabled:opacity-40">Dither compare</button></div><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Render mode<select value={renderMode} onChange={(event) => setRenderMode(event.target.value as RenderMode)} className="mt-2 w-full rounded-sm border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{RENDER_MODES.map((renderOption) => <option key={renderOption} value={renderOption}>{RENDER_LABELS[renderOption]}</option>)}</select></label><div className="flex items-center justify-between border-t border-white/[0.07] pt-3"><div><h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Invert</h3><p className="mt-1 text-xs text-slate-500">Dark/light swap</p></div><button type="button" onClick={() => setInvert((value) => !value)} className={`h-7 w-12 rounded-sm border transition ${invert ? "border-emerald-300/40 bg-emerald-300/20" : "border-white/10 bg-white/10"}`} aria-label="Invert output" aria-pressed={invert}><span className={`block h-4 w-4 rounded-sm bg-white transition ${invert ? "translate-x-6" : "translate-x-1"}`} /></button></div></div>

          {mode === "image" ? <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Image controls</h2><RangeControl label="Cell aspect" value={aspectFactor} min={0.25} max={2} step={0.05} onChange={setAspectFactor} format={(value) => value.toFixed(2)} /><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Aspect preset<select aria-label="Cell aspect preset" value={ASPECT_PRESETS.some((preset) => preset.value === aspectFactor) ? ASPECT_PRESETS.find((preset) => preset.value === aspectFactor)?.id : ""} onChange={(event) => { const preset = ASPECT_PRESETS.find((item) => item.id === event.target.value); if (preset) setAspectFactor(preset.value); }} className="mt-1 w-full rounded-sm border border-white/10 bg-black px-2 py-1 text-xs normal-case tracking-normal text-white"><option value="">Custom</option>{ASPECT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label} ({preset.value.toFixed(2)})</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Fit<select aria-label="Image fit mode" value={fitMode} onChange={(event) => setFitMode(event.target.value as FitMode)} className="mt-1 w-full rounded-sm border border-white/10 bg-black px-2 py-1 text-xs normal-case tracking-normal text-white"><option value="stretch">Stretch</option><option value="contain">Contain</option><option value="cover">Cover</option></select></label>{fitMode === "cover" ? <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Crop position<select aria-label="Crop position" value={cropPosition} onChange={(event) => setCropPosition(event.target.value as CropPosition)} className="mt-1 w-full rounded-sm border border-white/10 bg-black px-2 py-1 text-xs normal-case tracking-normal text-white">{["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"].map((position) => <option key={position} value={position}>{position.replace("-", " ")}</option>)}</select></label> : <div />}</div><RangeControl label="Brightness" value={adjustments.brightness} min={-100} max={100} step={1} onChange={(value) => updateAdjustment("brightness", value)} format={(value) => `${value > 0 ? "+" : ""}${value}`} /><RangeControl label="Contrast" value={adjustments.contrast} min={-100} max={100} step={1} onChange={(value) => updateAdjustment("contrast", value)} format={(value) => `${value > 0 ? "+" : ""}${value}`} /><RangeControl label="Gamma" value={adjustments.gamma} min={0.4} max={2.5} step={0.05} onChange={(value) => updateAdjustment("gamma", value)} format={(value) => value.toFixed(2)} /><RangeControl label="Saturation" value={adjustments.saturation} min={0} max={2} step={0.05} onChange={(value) => updateAdjustment("saturation", value)} format={(value) => `${Math.round(value * 100)}%`} /><RangeControl label="Threshold" value={adjustments.threshold} min={0} max={0.95} step={0.05} onChange={(value) => updateAdjustment("threshold", value)} format={(value) => value === 0 ? "Off" : `${Math.round(value * 100)}%`} /><RangeControl label="Tone levels" value={adjustments.toneLevels} min={0} max={16} step={1} onChange={(value) => updateAdjustment("toneLevels", value)} format={(value) => value < 2 ? "Auto" : String(value)} /><RangeControl label="Dither strength" value={adjustments.ditherStrength} min={0} max={1} step={0.05} onChange={(value) => updateAdjustment("ditherStrength", value)} format={(value) => `${Math.round(value * 100)}%`} /><RangeControl label="Grain" value={adjustments.grain} min={0} max={1} step={0.05} onChange={(value) => updateAdjustment("grain", value)} format={(value) => value === 0 ? "Off" : `${Math.round(value * 100)}%`} /><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Grain seed<input aria-label="Grain seed" type="number" value={Math.round(adjustments.grainSeed)} onChange={(event) => updateAdjustment("grainSeed", Math.round(Number(event.target.value) || 0))} className="mt-1 w-full rounded-sm border border-white/10 bg-black px-2 py-1 text-xs normal-case tracking-normal text-white" /></label><RangeControl label="Pre-filter" value={adjustments.preBlur} min={0} max={0.75} step={0.05} onChange={(value) => updateAdjustment("preBlur", value)} format={(value) => value === 0 ? "Off" : `${Math.round(value * 100)}%`} /><RangeControl label="Sharpness" value={adjustments.sharpness} min={0} max={100} step={1} onChange={(value) => updateAdjustment("sharpness", value)} suffix="%" /><RangeControl label="Blur" value={adjustments.blur} min={0} max={4} step={0.25} onChange={(value) => updateAdjustment("blur", value)} format={(value) => value === 0 ? "Off" : value.toFixed(2)} /></div> : null}

          <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Colour</h2>
            <div className="grid grid-cols-3 gap-1 mt-1 mb-2">
              {[
                { id: "source", label: "Source" },
                { id: "monochrome", label: "Mono" },
                { id: "palette", label: "Palette" },
                { id: "duotone", label: "Duotone" },
                { id: "gradient-map", label: "Gradient" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const kind = opt.id as ColourTreatment["kind"];
                    setColorMode(kind === "monochrome" ? "monochrome" : "colour");
                    setColourTreatment(
                      kind === "monochrome" ? { kind: "monochrome", colour: activePalette.foreground } :
                      kind === "palette" ? { kind: "palette", count: colorCount || 4 } :
                      kind === "duotone" ? { kind: "duotone", shadowColour: "#101820", highlightColour: "#f5f7fa" } :
                      kind === "gradient-map" ? { kind: "gradient-map", stops: ["#101820", "#f5f7fa"] } :
                      { kind: "source" }
                    );
                    setGeneratedArt(null);
                    setShowComparison(false);
                  }}
                  className={`rounded-sm border px-1 py-1.5 text-center text-xs transition ${
                    colourTreatment.kind === opt.id
                      ? "border-emerald-300/40 bg-emerald-300/10 text-white font-medium"
                      : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {colourTreatment.kind === "monochrome" ? <div className="grid grid-cols-2 gap-1">{PALETTES.map((option) => <button key={option.id} type="button" onClick={() => { setPalette(option.id); setColourTreatment({ kind: "monochrome", colour: option.foreground }); setImageBackground((current) => current.kind === "solid" ? { kind: "solid", colour: option.background } : current); }} className={`rounded-sm border px-2 py-2 text-xs ${palette === option.id ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-400"}`}>{option.name}</button>)}</div> : null}{colourTreatment.kind === "palette" ? <div className="grid grid-cols-4 gap-1">{COLOR_COUNTS.filter((count) => count > 0).map((count) => <button key={count} type="button" onClick={() => { setColorCount(count); setColourTreatment({ kind: "palette", count }); setGeneratedArt(null); }} className={`rounded-sm border px-2 py-2 text-xs ${colourTreatment.count === count ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-400"}`}>{count}</button>)}</div> : null}{colourTreatment.kind === "duotone" ? <div className="grid grid-cols-2 gap-2"><label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Shadow<input aria-label="Duotone shadow" type="color" value={colourTreatment.shadowColour} onChange={(event) => setColourTreatment({ ...colourTreatment, shadowColour: event.target.value })} className="mt-1 h-8 w-full" /></label><label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Highlight<input aria-label="Duotone highlight" type="color" value={colourTreatment.highlightColour} onChange={(event) => setColourTreatment({ ...colourTreatment, highlightColour: event.target.value })} className="mt-1 h-8 w-full" /></label></div> : null}{colourTreatment.kind === "gradient-map" ? <div className="space-y-1">{colourTreatment.stops.map((stop, index) => <label key={`${index}-${stop}`} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">Stop {index + 1}<input aria-label={`Gradient map stop ${index + 1}`} type="color" value={stop} onChange={(event) => setColourTreatment({ ...colourTreatment, stops: colourTreatment.stops.map((value, stopIndex) => stopIndex === index ? event.target.value : value) })} className="h-7 flex-1" /></label>)}{colourTreatment.stops.length < 4 ? <button type="button" onClick={() => setColourTreatment({ ...colourTreatment, stops: [...colourTreatment.stops, "#ffffff"] })} className="w-full rounded-sm border border-white/10 px-2 py-1 text-xs text-slate-300">Add stop</button> : null}{colourTreatment.stops.length > 2 ? <button type="button" onClick={() => setColourTreatment({ ...colourTreatment, stops: colourTreatment.stops.slice(0, -1) })} className="w-full rounded-sm border border-white/10 px-2 py-1 text-xs text-slate-300">Remove stop</button> : null}</div> : null}</div>
          </> : null}
          <div className="space-y-2 rounded-md border border-white/10 bg-black/40 p-3 text-sm text-slate-300">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Layout</div>
            <RangeControl label="Sidebar width" value={sidebarWidth} min={240} max={450} step={4} onChange={setSidebarWidth} suffix="px" />
          </div>
          <div className="rounded-md border border-white/10 bg-black/40 p-3 text-sm text-slate-300"><div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">Stats</div><div className="flex justify-between"><span>Characters</span><span>{characterSetDisplay.length}</span></div><div className="mt-2 flex justify-between"><span>Columns</span><span>{generatedArt?.columns || resolutionColumns}</span></div><div className="mt-2 flex justify-between"><span>Shortcuts</span><span className="font-mono text-xs">U upload · C copy · R reset</span></div></div>
        </aside>
      </div>
    </div>
    {showDitherCompare ? <div role="dialog" aria-modal="true" aria-labelledby="dither-compare-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowDitherCompare(false); compareButtonRef.current?.focus(); } }}>
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-white/15 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
          <div><h2 id="dither-compare-title" className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Dither compare</h2><p className="mt-1 text-xs text-slate-500">Same image and settings, varied only by algorithm.</p></div>
          <button ref={compareCloseRef} type="button" onClick={() => { setShowDitherCompare(false); compareButtonRef.current?.focus(); }} className="rounded-sm border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10">Close</button>
        </div>
        <div className="grid min-h-0 grid-cols-1 gap-2 overflow-auto p-3 sm:grid-cols-2">
          {compareAlgorithms.map((algorithm, index) => {
            const variant = comparisonArts.find((item) => item.algorithm === algorithm)?.art;
            return <div key={`${index}-${algorithm}`} className="min-w-0 rounded-sm border border-white/10 bg-black/50 p-2">
              <div className="mb-2 flex items-center justify-between gap-2"><label className="min-w-0 flex-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">Slot {index + 1}<select aria-label={`Dither compare slot ${index + 1}`} value={algorithm} onChange={(event) => setCompareAlgorithms((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value as DitherAlgorithm : item))} className="mt-1 w-full rounded-sm border border-white/10 bg-black px-2 py-1 text-xs normal-case tracking-normal text-white"><DitherOptions /></select></label><span className="pt-4 text-right text-[10px] text-emerald-200">{DITHER_LABELS[algorithm]}</span></div>
              {variant ? <pre className="max-h-[48vh] overflow-auto rounded-sm border border-white/10 p-2 font-mono text-[7px] leading-[1.1] text-slate-100 sm:text-[9px]">{variant.lines.map((line, row) => <Fragment key={`${row}-${line}`}><ColouredFigletLine line={line} colors={variant.colors[row] ?? []} fallback={variant.foreground} row={row} />{row < variant.lines.length - 1 ? "\n" : null}</Fragment>)}</pre> : <div className="flex min-h-32 items-center justify-center rounded-sm border border-white/10 text-xs text-slate-500">{isComparing ? "Rendering…" : "No preview"}</div>}
            </div>;
          })}
        </div>
      </div>
    </div> : null}
  </main>;
}
