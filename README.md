# pf1e-character-builder

A Pathfinder 1st Edition character sheet web app. It works offline, saves to your browser, exports and imports JSON, and prints (or saves as PDF).

## Features

- **Tabs: Core and Character** (plus optional Spells, Companions and Mythic). The layout follows `character-sheet-mockup.pdf`. On narrow screens the sections stack in one column; drag them into your own order under **Settings → Layout & print**.
- **Live calculations.** Ability scores, size (including Enlarge/Reduce Person, which also scale weapon dice), class levels, armor, conditions and macros flow into AC, saves, attacks, CMB/CMD, skills, HP, carrying capacity and spell DCs. Hover a number to see its breakdown.
- **Macros.** Toggle Power Attack, Flanking, Heroism, Haste and more from a built-in library, or write your own effects against any stat key. Values can be formulas such as `-1 - floor(@bab / 4)`. Always-on feats (Improved Initiative, Iron Will, Toughness…) aren't macros: picking the feat adds its bonus to the right section.
- **Rules database.** Search more than 3,000 spells, feats, weapons, armor, gear and magic items, then add them to the sheet. Picking an entry copies it into the character, so you can edit it freely.
- **Wealth tracking.** Every item, weapon, armor piece and magic item has a gp value. Equipment totals carried weight and overall character wealth.
- **Mythic (optional).** Turn on the Mythic tab in **Settings** to track tier, path, mythic power, surge die (with feat upgrades) and Mythic Paragon. Mythic hit points, Amazing Initiative and ability score increases feed into the rest of the sheet.
- **Companions (optional).** Turn on the Companions tab in **Settings** for familiars, animal companions (and mounts, plant or vermin companions), eidolons (chained and unchained, with base forms and an evolution pool), phantoms (emotional focus, ectoplasmic or incorporeal), drakes and other creatures. Each follows its progression table from the master's class level; a species picker fills in animal companion and familiar stat blocks.
- **Spells (optional).** Turn on the Spells tab in **Settings**. Each casting class gets its own "[Class] Spells" section; add more (including "Other" for racial or item spells) from **Settings**.
- **Dice.** Click initiative, saves, attacks, skills, ability modifiers or caster level to roll d20 plus the sheet's bonus; weapons roll damage and criticals. A roll log (chat-style drawer with a quick tray for the seven standard dice) keeps the history with each roll's breakdown. Optional 3D physics dice via dice-box in Settings.
- **Campaign Notes.** A rich text page (headings, lists, task lists, tables, links) saved with the character; left out of print unless you turn it on in Settings.
- **First visit.** A short walkthrough points at the Edit and ℹ buttons, the dice log and the Settings tab once per device; replay it from Settings → Help.
- **Edit mode and info.** Each section's pencil button reveals its add, reorder, remove and database-search controls; values are always editable. The **ℹ** button collects every breakdown and rule note that's otherwise only in hover tooltips, so it works on phones too.
- **Configurable.** Collapse any section, or hide it on screen or in print (the gear tab, **Settings**). Dark mode follows your system until you toggle it in Settings; printing always uses the light theme. Printed dynamic tables include one blank row for handwritten additions.
- **Multiple characters.** Create, duplicate and switch between characters. Use **Export JSON** for backups.
- **Offline.** It's a PWA: after the first visit it runs with no network connection.

## TODO

- **Desktop section layout.** Let users place each section in the left column, right column or full width, and order them, on desktop (and so in print). Keep the paired rows (Character Info with Currency, Hit Points with Ability Scores, Bio and Traits beside Portrait) as locked groups. Core's spillover layout (`src/lib/ui/spillover.ts`) already works on this left/right/wide model; Character and Mythic would move off their fixed `grid-template-areas`. Print breaks need checking with `pnpm shots --pdf`.

## Development

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # unit tests (rules engine and data migration)
pnpm check        # type check
pnpm build        # production build with service worker
```

### Verification scripts

These need the dev server running, plus Google Chrome:

```sh
pnpm checks                                    # drives the UI and asserts derived values
pnpm shots --fixture scripts/fixtures/valeros.json --slice 1400 --pdf
```

Screenshots and `sheet.pdf` go to `.shots/`.

### Rebuilding the rules data

`public/data/*.json` is generated from three Foundry VTT compendia (OGL 1.0a game content):

- the [Foundry VTT PF1 system](https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1) packs: spells, feats, items and the base and unchained classes;
- the pf1-content module (GitLab project 47251054): the remaining feats, animal companions, familiars and eidolon evolutions;
- the pf1e-archetypes module (GitLab project 47896698): prestige classes.

Both modules are GPL-3 code wrapping Paizo Community Use / OGL game data; only the data is imported. Each download comes with its own `OGL.txt`, whose Section 15 notices are merged into `public/data/OGL.txt`.

```sh
mkdir /tmp/pf1 && cd /tmp/pf1
curl -L -o packs.tar.gz "https://gitlab.com/api/v4/projects/foundryvtt_pathfinder1e%2Ffoundryvtt-pathfinder1/repository/archive.tar.gz?sha=master&path=packs"
tar xzf packs.tar.gz
curl -o foundryvtt-*/OGL.txt "https://gitlab.com/api/v4/projects/foundryvtt_pathfinder1e%2Ffoundryvtt-pathfinder1/repository/files/OGL.txt/raw?ref=master"
mkdir content && curl -L "https://gitlab.com/api/v4/projects/47251054/repository/archive.tar.gz?sha=main&path=src" | tar xz -C content
curl -o content/OGL.txt "https://gitlab.com/api/v4/projects/47251054/repository/files/OGL.txt/raw?ref=main"
mkdir archetypes && curl -L "https://gitlab.com/api/v4/projects/47896698/repository/archive.tar.gz?sha=main&path=src" | tar xz -C archetypes
curl -o archetypes/OGL.txt "https://gitlab.com/api/v4/projects/47896698/repository/files/OGL.txt/raw?ref=main"
cd -
pnpm import-data /tmp/pf1/foundryvtt-*/packs \
  --content /tmp/pf1/content/*/src --ogl-content /tmp/pf1/content/OGL.txt \
  --archetypes /tmp/pf1/archetypes/*/src --ogl-archetypes /tmp/pf1/archetypes/OGL.txt
```

`--content` and `--archetypes` are optional; with only the system packs the importer rebuilds spells, feats, items and classes and leaves the other files alone. The OGL text for each root defaults to `<root>/../OGL.txt`. The importer logs how many entries needed a fallback (for example a familiar whose ability scores or natural armor only appear in its stat block notes).

## Legal

This website uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's Community Use Policy. It is not published, endorsed, or specifically approved by Paizo. The rules data is Open Game Content under the Open Game License v1.0a. The license text is in the app's **About & licenses** dialog (Settings → Help & data) and in `public/data/OGL.txt`.
