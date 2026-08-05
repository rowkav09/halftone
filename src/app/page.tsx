"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HalftoneLogo } from "@/components/HalftoneLogo";
import {
  CHARACTER_SETS,
  PALETTES,
  RESOLUTION_PRESETS,
  type ArtOptions,
  type CharacterSetId,
  type ColorMode,
  type PaletteId,
  type ResolutionKey,
  generateArtFromImage,
  sanitizeCustomCharacters,
} from "@/lib/art";
import { CUSTOM_TEXT_STYLES, TEXT_OUTPUT_FORMATS, type TextOutputFormat, generateCustomTextArt } from "@/lib/customText";

const CHARACTER_SET_OPTIONS: Array<{ id: CharacterSetId; label: string; sample: string }> = [
  { id: "ascii", label: "ASCII", sample: "@#%*+=-:." },
  { id: "braille", label: "Braille", sample: "⣿⣷⣶⣤⣄⣀" },
  { id: "blocks", label: "Blocks", sample: "█▓▒░" },
  { id: "unicode", label: "Unicode Dense", sample: "▁▂▃▄▅▆▇█▓▒░" },
  { id: "unicodeFine", label: "Unicode Fine", sample: "@#WMW$B8&" },
  { id: "custom", label: "Custom glyphs", sample: "ROWAN" },
];

const RESOLUTION_OPTIONS: ResolutionKey[] = ["low", "medium", "high", "ultra", "packed"];
const USAGE_ENDPOINT = "/api/uses";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileUrlRef = useRef<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [mode, setMode] = useState<"image" | "text">("image");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Choose an image or create an ASCII text banner.");
  const [characterSet, setCharacterSet] = useState<CharacterSetId>("ascii");
  const [customGlyphs, setCustomGlyphs] = useState("ROWAN");
  const [textValue, setTextValue] = useState("HELLO");
  const [textStyleIndex, setTextStyleIndex] = useState(0);
  const [textOutputFormat, setTextOutputFormat] = useState<TextOutputFormat["id"]>("ascii");
  const [resolutionIndex, setResolutionIndex] = useState(1);
  const [invert, setInvert] = useState(false);
  const [palette, setPalette] = useState<PaletteId>("bw");
  const [colorMode, setColorMode] = useState<ColorMode>("colour");
  const [renderCount, setRenderCount] = useState(0);
  const [artLines, setArtLines] = useState<string[]>([]);
  const [columns, setColumns] = useState(0);
  const [rows, setRows] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageReady, setImageReady] = useState(false);

  const selectedResolution = RESOLUTION_OPTIONS[Math.min(4, Math.max(0, resolutionIndex))] ?? "medium";
  const activeTextStyle = CUSTOM_TEXT_STYLES[textStyleIndex] ?? CUSTOM_TEXT_STYLES[0];
  const activePalette = useMemo(() => PALETTES.find((option) => option.id === palette) ?? PALETTES[0], [palette]);

  useEffect(() => {
    let cancelled = false;
    void fetch(USAGE_ENDPOINT, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { count?: number } | null) => {
        if (!cancelled && typeof data?.count === "number") setRenderCount(data.count);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current); }, []);

  const incrementUsage = useCallback(async () => {
    try {
      const response = await fetch(USAGE_ENDPOINT, { method: "POST" });
      const data = response.ok ? await response.json() as { count?: number } : null;
      if (typeof data?.count === "number") setRenderCount(data.count);
    } catch { /* Counter availability never blocks generation. */ }
  }, []);

  const drawGeneratedArt = useCallback((generated: Awaited<ReturnType<typeof generateArtFromImage>>) => {
    const canvas = previewCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) throw new Error("Canvas 2D context is unavailable.");
    const isPacked = selectedResolution === "packed";
    const fontSize = isPacked ? 11 : 16;
    const padding = isPacked ? 12 : 20;
    const glyphAdvance = isPacked ? 7 : 12;
    const lineHeight = isPacked ? 11 : 20;
    canvas.width = Math.max(1, generated.columns * glyphAdvance + padding * 2);
    canvas.height = Math.max(1, generated.rows * lineHeight + padding * 2);
    context.fillStyle = generated.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = `${fontSize}px var(--font-mono), monospace`;
    context.textBaseline = "top";
    generated.lines.forEach((line, row) => Array.from(line).forEach((glyph, column) => {
      context.fillStyle = generated.colors[row]?.[column] ?? generated.foreground;
      context.fillText(glyph, padding + column * glyphAdvance, padding + row * lineHeight);
    }));
  }, [selectedResolution]);

  const renderArt = useCallback(async () => {
    const options: ArtOptions = {
      columns: RESOLUTION_PRESETS[selectedResolution].columns,
      characterSet,
      customText: customGlyphs,
      invert,
      palette,
      colorMode,
      packed: selectedResolution === "packed",
    };
    if (mode === "image" && !imageRef.current) return;
    if (!activeTextStyle) return;
    setIsRendering(true);
    try {
      const generated = mode === "text"
        ? generateCustomTextArt(textValue, activeTextStyle, textOutputFormat)
        : await generateArtFromImage(imageRef.current as HTMLImageElement, options);
      setArtLines(generated.lines);
      setColumns(generated.columns);
      setRows(generated.rows);
      if (mode === "image") drawGeneratedArt(generated);
      setStatus(`Rendered ${generated.columns} x ${generated.rows} characters.`);
      void incrementUsage();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to render the preview.");
    } finally {
      setIsRendering(false);
    }
  }, [activeTextStyle, characterSet, colorMode, customGlyphs, drawGeneratedArt, incrementUsage, invert, mode, palette, selectedResolution, textOutputFormat, textValue]);

  useEffect(() => {
    if (mode !== "text" && !imageReady) return;
    const timer = window.setTimeout(() => void renderArt(), 0);
    return () => window.clearTimeout(timer);
  }, [imageReady, mode, renderArt]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) { setStatus("Please choose an image file."); return; }
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    setFileName(file.name);
    setMode("image");
    setImageReady(false);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => { imageRef.current = image; setImageReady(true); };
    image.onerror = () => { setStatus("That file could not be loaded as an image."); setImageReady(false); };
    image.src = url;
  };

  const characterSetDisplay = useMemo(() => characterSet === "custom"
    ? sanitizeCustomCharacters(customGlyphs) || CHARACTER_SETS.ascii
    : CHARACTER_SETS[characterSet], [characterSet, customGlyphs]);

  const exportName = mode === "text" ? textValue.trim().toLowerCase().replace(/\s+/g, "-") || "text-art" : fileName.replace(/\.[^.]+$/, "") || "halftone";
  const exportText = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([artLines.join("\n")], { type: "text/plain;charset=utf-8" }));
    link.download = `${exportName}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <main className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-4 lg:px-5">
        <header className="border-b border-white/10 pb-3">
          <div className="flex justify-end pb-2"><span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">{renderCount.toLocaleString()} generations</span></div>
          <HalftoneLogo />
        </header>

        <div className="grid flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
          <section className="space-y-3 rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm">
            <div className={`rounded-[0.9rem] border border-dashed p-3 transition ${isDragging ? "border-emerald-300 bg-emerald-300/10" : "border-white/15 bg-black/40"}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files.item(0); if (file) loadFile(file); }}>
              <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) loadFile(file); }} />
              <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Upload image</p><p className="mt-1 font-mono text-[11px] text-slate-400">{fileName || "no file"}</p></div><button type="button" onClick={() => inputRef.current?.click()} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10">Browse</button></div>
            </div>

            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3">
              <h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Create from</h2>
              <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode("image")} className={`rounded-xl border px-3 py-2 text-sm ${mode === "image" ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-300"}`}>Image</button><button type="button" onClick={() => setMode("text")} className={`rounded-xl border px-3 py-2 text-sm ${mode === "text" ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-300"}`}>Text</button></div>
              {mode === "text" ? <><textarea value={textValue} onChange={(event) => setTextValue(event.target.value)} rows={2} className="w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-300/40" placeholder="HELLO" /><label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Output format<select value={textOutputFormat} onChange={(event) => setTextOutputFormat(event.target.value as TextOutputFormat["id"])} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40">{TEXT_OUTPUT_FORMATS.map((format) => <option key={format.id} value={format.id}>{format.name}</option>)}</select></label><div className="grid grid-cols-2 gap-2">{CUSTOM_TEXT_STYLES.map((style, index) => <button key={style.id} type="button" onClick={() => setTextStyleIndex(index)} className={`rounded-lg border px-2 py-2 text-left text-xs ${textStyleIndex === index ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 text-slate-400"}`}>{style.name}</button>)}</div></> : null}
            </div>

            {mode === "image" ? <>
            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Character set</h2><div className="grid gap-2">{CHARACTER_SET_OPTIONS.map((option) => <button key={option.id} type="button" onClick={() => setCharacterSet(option.id)} className={`rounded-xl border px-3 py-2 text-left ${characterSet === option.id ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10 bg-white/[0.03]"}`}><span className="text-sm text-white">{option.label}</span><span className="mt-1 block font-mono text-[10px] text-slate-500">{option.sample}</span></button>)}</div>{characterSet === "custom" ? <textarea value={customGlyphs} onChange={(event) => setCustomGlyphs(event.target.value)} rows={2} className="w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-300/40" placeholder="@#%" /> : null}</div>

            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3"><div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-slate-500"><span>Resolution</span><span>{RESOLUTION_PRESETS[selectedResolution].label}</span></div><input type="range" min={0} max={4} value={resolutionIndex} onChange={(event) => setResolutionIndex(Number(event.target.value))} className="h-2 w-full accent-emerald-300" /><div className="flex justify-between text-[9px] uppercase text-slate-500">{RESOLUTION_OPTIONS.map((option) => <span key={option}>{RESOLUTION_PRESETS[option].label}</span>)}</div></div>
            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3"><div className="flex items-center justify-between"><div><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Invert</h2><p className="mt-1 text-xs text-slate-400">Dark/light swap</p></div><button type="button" onClick={() => setInvert((value) => !value)} className={`h-7 w-12 rounded-full border ${invert ? "border-emerald-300/40 bg-emerald-300/20" : "border-white/10 bg-white/10"}`} aria-pressed={invert} /></div></div>
            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Colour mode</h2><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setColorMode("colour")} className={`rounded-xl border px-3 py-2 text-sm ${colorMode === "colour" ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10 text-slate-300"}`}>Colour</button><button type="button" onClick={() => setColorMode("monochrome")} className={`rounded-xl border px-3 py-2 text-sm ${colorMode === "monochrome" ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10 text-slate-300"}`}>Monochrome</button></div></div>
            </> : null}
          </section>

          <section className="flex min-h-[72vh] flex-col rounded-[1rem] border border-white/10 bg-black/60 p-3">
            <div className="mb-3 flex justify-between px-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              <span>{mode === "text" ? "ASCII output" : "Preview"}</span>
              <span>{artLines.length ? `${columns} x ${rows}` : "waiting"}</span>
            </div>
            {mode === "text" ? (
              <pre style={{ color: activePalette.foreground, backgroundColor: activePalette.background }} className="min-h-0 flex-1 overflow-auto rounded-[0.9rem] border border-white/10 p-5 font-mono text-[10px] leading-[0.9rem]">{artLines.length ? artLines.join("\n") : "Type text to generate an ASCII banner."}</pre>
            ) : (
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-[0.9rem] border border-white/10 bg-black">
                <canvas ref={previewCanvasRef} className={artLines.length ? "h-auto w-full max-w-full" : "hidden"} />
                {!artLines.length ? <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-slate-500">drop image</p> : null}
                {isRendering ? <div className="absolute inset-0 grid place-items-center bg-black/55 text-[10px] uppercase tracking-[0.3em] text-emerald-200">Rendering</div> : null}
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">{status}</p>
          </section>

          <aside className="space-y-3 rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm"><div className="space-y-3 rounded-[0.9rem] border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Export</h2>{mode === "image" ? <button type="button" disabled={!artLines.length} onClick={() => { const canvas = previewCanvasRef.current; if (!canvas) return; const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `${exportName}.png`; link.click(); }} className="w-full rounded-full bg-emerald-300 px-3 py-2 text-sm font-semibold text-black disabled:opacity-40">Export PNG</button> : null}<button type="button" disabled={!artLines.length} onClick={exportText} className="w-full rounded-full border border-white/10 px-3 py-2 text-sm text-white disabled:opacity-40">Export TXT</button></div><div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3"><h2 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Ink theme</h2>{PALETTES.map((option) => <button key={option.id} type="button" onClick={() => setPalette(option.id)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${palette === option.id ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10"}`}><span className="text-sm text-white">{option.name}</span><span className="h-3 w-3 rounded-full" style={{ backgroundColor: option.foreground }} /></button>)}</div><div className="rounded-[0.9rem] border border-white/10 bg-black/40 p-3 text-sm text-slate-300"><div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">Stats</div><div className="flex justify-between"><span>Characters</span><span>{characterSetDisplay.length}</span></div><div className="mt-2 flex justify-between"><span>Columns</span><span>{columns || RESOLUTION_PRESETS[selectedResolution].columns}</span></div></div></aside>
        </div>
      </div>
    </main>
  );
}
