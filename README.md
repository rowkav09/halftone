# Halftone

A browser-only image-to-text-art generator built with Next.js, TypeScript, and Tailwind.

## What it does

- Upload an image by drag and drop or file picker.
- Choose a character set: ASCII, Braille, Blocks, or custom text.
- Adjust resolution, invert mode, and preview the result live.
- Export the generated art as PNG or TXT.
- Includes placeholder panels for color palettes and presets planned for version 1.

## Example outputs

ASCII ramp:

```txt
@%#*+=-:.
%#*+=-:.. 
*+=-::..  
=-::..    
```

Braille ramp:

```txt
⣿⣷⣶⣤⣄⣀
⣷⣶⣤⣄⣀  
⣶⣤⣄⣀    
```

Custom text art:

```txt
R O W A N
R O W A N
R O W A N
```

Unicode dense output:

```txt
▁▂▃▄▅▆▇█
░▒▓█▇▆▅▄
```

## Uses badge

The header includes a `uses` badge that increments every time the browser successfully renders a new art preview.
It is stored locally in the browser so the count persists between sessions on the same machine.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```