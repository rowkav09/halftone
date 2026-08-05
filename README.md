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

The header includes a shared `uses` badge that increments every time the browser successfully renders a new art preview.
Each render calls a small API route, so every visitor contributes to the same total.

To enable the counter on Vercel, add these environment variables:

```bash
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

The route also accepts `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` if you prefer those names.
Without those values, the app still runs, but the shared badge stays at `0`.

## Deployment note

Image processing still happens entirely in the browser.
The only server-side piece is the shared render counter backed by Upstash Redis.
Deploy it on Vercel with the two env vars above.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```