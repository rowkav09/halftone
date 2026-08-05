# Halftone

A browser-only image-to-text-art generator built with Next.js, TypeScript, and Tailwind.

## What it does

- Choose whether to generate from an uploaded image or typed text.
- Upload an image by drag and drop or file picker.
- Choose a character set: ASCII, Braille, Blocks, Unicode, or custom glyphs.
- Adjust resolution, inversion, and colour or monochrome output, then preview the result live.
- Export the generated art as PNG or TXT.
- Pick a monochrome ink theme: Black & White, Green Terminal, Amber CRT, or Blue.
- Watch an independent ASCII `HALFTONE` wordmark rotate through 50 treatments.
- Create large ASCII banners from exactly the words you enter, with Banner, Block, Outline, Shadow, Retro, Cyber, Glitch, Terminal, Heavy, and Minimal styles.

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

Text banner:

```txt
 #   # ##### #     #      ###
 #   # #     #     #     #   #
 ##### ####  #     #     #   #
 #   # #     #     #     #   #
 #   # ##### ##### #####  ###
```

Unicode dense output:

```txt
▁▂▃▄▅▆▇█
░▒▓█▇▆▅▄
```



## Build

```bash
npm run build
```
