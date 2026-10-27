# PF1e Character Sheet

Offline-first Pathfinder 1e character sheet. A single-page app built with Svelte 5 (runes), TypeScript, Vite, Tailwind v4 and vite-plugin-pwa.

## Commands
- `pnpm dev`: start the dev server
- `pnpm build`: production build, including the service worker
- `pnpm check`: run svelte-check (type checking)
- `pnpm test`: run the Vitest unit tests (rules engine only)
- `pnpm checks`: Playwright drives the UI against the dev server and asserts the cascades
- `pnpm shots --fixture scripts/fixtures/valeros.json --slice 1400 [--pdf]`: screenshots and a print PDF in `.shots/` for visual review
- `pnpm import-data <packs-dir>`: regenerate `public/data/*.json` from the Foundry PF1 packs (see README)

## Architecture
- `src/lib/model/` holds the `Character` type. It stores **inputs only** and has a `schemaVersion`. `migrate.ts` and `normalize()` run on every load and import.
- `src/lib/rules/` holds pure functions. `derive(character)` computes every displayed number. All adjustments flow through the bonus engine (`bonuses.ts`) as `{ key, value, type, source }`, following PF1 stacking rules.
- `src/lib/storage/` saves the roster and characters to localStorage.
- `src/lib/db/` lazy-loads the bundled rules data. `DbPicker` copies a picked entry into the character; characters never reference the database.
- `src/lib/state.svelte.ts` holds the app state: `app.char` is the character and `app.d` is `derive(app.char)`.
- `src/lib/ui/` holds shared components. `DynamicTable` renders one extra blank row when printing.
- `src/tabs/{core,character,companions,spells,mythic}/` holds one component per section.
- Print and PDF use `@media print` (the Tailwind `print:` variant). There is no PDF library.

## Conventions
- Commits are small and use Conventional Commits. Commit straight to `main`. End every message with a `Co-Authored-By:` trailer.
- Tests are deliberately light: unit-test `src/lib/rules` and model migrations. Verify UI work with `pnpm checks`, then take screenshots with `pnpm shots` and inspect them.
- Playwright uses the installed Google Chrome (`channel: 'chrome'`).
- Svelte's `class:` directive can't take Tailwind variants that contain a colon (such as `class:print:hidden`). Use a class array instead: `class={['x', { 'print:hidden': cond }]}`.
- Never store derived values on `Character`. Add them to `derive()` instead.
