# PF1e Character Sheet

Offline-first Pathfinder 1e character sheet. A single-page app built with Svelte 5 (runes), TypeScript, Vite, Tailwind v4 and vite-plugin-pwa.

## Commands
- `pnpm dev`: start the dev server
- `pnpm build`: production build, including the service worker
- `pnpm check`: run svelte-check (type checking)
- `pnpm test`: run the Vitest unit tests (rules engine only)

## Architecture
- `src/lib/model/` holds the `Character` type. It stores **inputs only** and has a `schemaVersion`. `migrate.ts` and `normalize()` run on every load and import.
- `src/lib/rules/` holds pure functions. `derive(character)` computes every displayed number. All adjustments flow through the bonus engine (`bonuses.ts`) as `{ key, value, type, source }`, following PF1 stacking rules.
- `src/lib/storage/` saves the roster and characters to localStorage.
- `src/lib/ui/` holds shared components. `DynamicTable` renders one extra blank row when printing.
- `src/tabs/{combat,character,spells}/` holds one component per section.
- Print and PDF use `@media print` (the Tailwind `print:` variant). There is no PDF library.

## Conventions
- Commits are small and use Conventional Commits. Commit straight to `main`. End every message with a `Co-Authored-By:` trailer.
- Tests are deliberately light: unit-test `src/lib/rules` and model migrations. Verify UI work by taking screenshots with Playwright (`scripts/shots.ts`) and inspecting them.
- Never store derived values on `Character`. Add them to `derive()` instead.
