[![Total generations](https://img.shields.io/endpoint?url=https%3A%2F%2Fhalftone-black.vercel.app%2Fapi%2Fbadge)](https://halftone-black.vercel.app/)

```
oooo                  oooo   .o88o.     .                                   
`888                  `888   888 `"   .o8                                   
 888 .oo.    .oooo.    888  o888oo  .o888oo  .ooooo.  ooo. .oo.    .ooooo.  
 888P"Y88b  `P  )88b   888   888      888   d88' `88b `888P"Y88b  d88' `88b 
 888   888   .oP"888   888   888      888   888   888  888   888  888ooo888 
 888   888  d8(  888   888   888      888 . 888   888  888   888  888    .o 
o888o o888o `Y888""8o o888o o888o     "888" `Y8bod8P' o888o o888o `Y8bod8P' 
```



Turn images into character art, or type a phrase to generate copy-ready FIGlet banners.

## Features

- Image mode with ASCII, Braille, Blocks, Unicode, Binary, Matrix, Symbols, and custom glyph sets.
- Fit, crop, aspect, brightness, contrast, gamma, saturation, threshold, grain, sharpness, blur, and dithering controls.
- Curated image presets plus a dither comparison view for experimenting with output quality.
- Original ↔ generated-art comparison with a draggable divider; the source is transformed to the exact rendered output dimensions.
- Text mode with 38 curated FIGlet styles, including Graffiti, Cyberlarge, Fun Faces, Star Wars, and more.
- Output formatting for plain ASCII, `//`, `/* */`, SQL, JavaDoc, Bash, SGML, Echo, Python, and Batch comments.
- Palette-aware text output in Black & White, Green Terminal, Amber CRT, and Blue.
- PNG, SVG, HTML, ANSI, TXT export, clipboard copy, drag-and-drop, and pasted images.
- Renderer settings links for sharing configurations. Uploaded images are intentionally not embedded in URLs.
- A live generations badge backed by Upstash Redis.

## Operations

The usage counter and `POST /api/uses` require an Upstash Redis REST URL and token. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or the documented Vercel KV aliases in `.env.example`). If Redis is missing or unavailable, `POST /api/uses` intentionally responds with `503` without provider details; `GET /api/uses` safely reports `count: 0` and `configured: false`.

`POST /api/uses` uses an atomic Redis Lua script for a fixed-window limiter. Defaults are 30 requests per 60 seconds and can be bounded with `USAGE_RATE_LIMIT_MAX` and `USAGE_RATE_LIMIT_WINDOW_SECONDS`. On Vercel, the limiter keys requests by a SHA-256-truncated `x-vercel-forwarded-for` value; this header is trusted only when `VERCEL=1`. Outside Vercel, malformed values, or absent headers, it deliberately falls back to one shared key rather than trusting client-supplied forwarding headers. This avoids per-client bypasses but can throttle all local or non-Vercel traffic together. Limited requests receive `429 {"error":"rate_limited"}` plus `Retry-After` and `X-RateLimit-*` headers.

## Live examples

Generated on the live [Halftone site](https://halftone-black.vercel.app/).

### Alligator — `HALFTONE`

```plain
      :::    :::     :::     :::        :::::::::: ::::::::::: ::::::::  ::::    ::: :::::::::: 
     :+:    :+:   :+: :+:   :+:        :+:            :+:    :+:    :+: :+:+:   :+: :+:         
    +:+    +:+  +:+   +:+  +:+        +:+            +:+    +:+    +:+ :+:+:+  +:+ +:+          
   +#++:++#++ +#++:++#++: +#+        :#::+::#       +#+    +#+    +:+ +#+ +:+ +#+ +#++:++#      
  +#+    +#+ +#+     +#+ +#+        +#+            +#+    +#+    +#+ +#+  +#+#+# +#+            
 #+#    #+# #+#     #+# #+#        #+#            #+#    #+#    #+# #+#   #+#+# #+#             
###    ### ###     ### ########## ###            ###     ########  ###    #### ##########
```
### Banner 3D — `CREATE`

```plain
:'######::'########::'########::::'###::::'########:'########:
'##... ##: ##.... ##: ##.....::::'## ##:::... ##..:: ##.....::
 ##:::..:: ##:::: ##: ##::::::::'##:. ##::::: ##:::: ##:::::::
 ##::::::: ########:: ######:::'##:::. ##:::: ##:::: ######:::
 ##::::::: ##.. ##::: ##...:::: #########:::: ##:::: ##...::::
 ##::: ##: ##::. ##:: ##::::::: ##.... ##:::: ##:::: ##:::::::
. ######:: ##:::. ##: ########: ##:::: ##:::: ##:::: ########:
:......:::..:::::..::........::..:::::..:::::..:::::........::
```
