# Repository Guidelines

## Project Structure & Module Organization

Halftone is a Next.js App Router project. Keep page-level UI in `src/app/`: `page.tsx` is the interactive generator, `globals.css` holds global styles, and `api/` contains the usage and badge routes. Reusable UI belongs in `src/components/`; the rotating brand treatment is isolated in `HalftoneLogo.tsx`.

Rendering logic lives in `src/lib/`. Keep image conversion and character-set code in `art.ts`, FIGlet text generation and export wrappers in `customText.ts`, and logo-specific configuration in `logo.ts`. Put static public assets in `public/`. Do not add unrelated repositories or generated projects beneath this repository root; TypeScript is intentionally scoped to `src/`.

## Build, Test, and Development Commands

- `npm run dev` — run the local Next.js development server.
- `npm run lint` — run ESLint across the project.
- `npx tsc --noEmit` — type-check the TypeScript source.
- `npm run build` — create and validate the production build.
- `npm run start` — serve a completed production build.

Run lint, type checking, and a production build before publishing user-visible changes.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing two-space indentation, semicolons, double-quoted strings, and Tailwind utility classes in TSX. Use `PascalCase` for components and exported types, `camelCase` for functions and values, and descriptive kebab-case filenames only where the framework requires them. Prefer small pure helpers in `src/lib/` for rendering algorithms; keep UI state out of those helpers.

## Testing Guidelines

There is no dedicated test runner yet. Add focused unit tests alongside new pure rendering utilities when introducing non-trivial algorithms. At minimum, verify the controls affected by a change in the browser and run the three checks above. Preserve deterministic output for identical image inputs and settings.

## Commit & Pull Request Guidelines

Use concise Conventional Commit-style messages, for example `feat: add fullscreen ascii intro` or `fix: improve image art contrast`. Keep commits single-purpose. PRs should explain the user-visible effect, list validation commands, link related issues when available, and include screenshots or short recordings for UI or rendering changes.

## Security & Configuration

Never commit tokens or `.env` files. Usage counting reads Upstash credentials from environment variables; treat them as deployment configuration, not client-side values.
