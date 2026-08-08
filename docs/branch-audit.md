# Branch and PR audit

Audit performed against `main` at `96c88ad`.

## Kept / salvaged

- `origin/devin/1786150822-dither-correctness` (open PR #8): not merged directly because it is dirty and overlaps merged PR #9. Salvaged ideas included complete image presets, renderer controls, dither comparison, background/color treatment support, and additional tests. Current implementation was repaired in place where those ideas were already present.
- `origin/feat/improve-dithering-and-backgrounds-17382717613092662407`: retained only as historical reference during review. Its useful UX changes overlap current controls; no blind merge performed.

## Obsolete branches

These branches were inspected and found to be merged, duplicated, or archival copies with no unique work worth preserving:

- `origin/ci/add-quality-gates` — merged as `4c59ccb`.
- `origin/fix/usage-api-reliability` — merged as `4a5af2a`.
- `origin/test/renderer-determinism` — merged as `c84e4d1`.
- `origin/feature/presets-and-effects` — superseded historical development line.
- `origin/fix/ascii-text-generation-mode` — merged through current text-generation history.
- `origin/fix/separate-logo-generator` — merged through current logo history.
- `origin/vercel/install-vercel-web-analytics-i-v2z4dv` — merged analytics work.
- all `origin/history-standardized/*` branches — archival duplicates of the branches above.

No branch was deleted until its diff and history had been inspected. PR #8 should be closed after this replacement work is accepted; remote branch deletion is limited to the obsolete list above.
