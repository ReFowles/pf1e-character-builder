# pf1e-character-builder

A Pathfinder 1st Edition character sheet web app. It works offline, saves to your browser, exports and imports JSON, and prints (or saves as PDF).

## Features

- **Tabs: Core, Character and Spells** (plus optional Mythic). The layout follows `character-sheet-mockup.pdf`. On narrow screens the sections stack in the mockup's numbered order.
- **Live calculations.** Ability scores, size (including Enlarge/Reduce Person, which also scale weapon dice), class levels, armor, conditions and macros flow into AC, saves, attacks, CMB/CMD, skills, HP, carrying capacity and spell DCs. Hover a number to see its breakdown.
- **Macros.** Toggle Power Attack, Flanking, Heroism, Haste and more from a built-in library, or write your own effects against any stat key. Values can be formulas such as `-1 - floor(@bab / 4)`. Always-on feats (Improved Initiative, Iron Will, Toughness…) aren't macros: picking the feat adds its bonus to the right section.
- **Rules database.** Search more than 3,000 spells, feats, weapons, armor, gear and magic items, then add them to the sheet. Picking an entry copies it into the character, so you can edit it freely.
- **Wealth tracking.** Every item, weapon, armor piece and magic item has a gp value. Equipment totals carried weight and overall character wealth.
- **Mythic (optional).** Turn on the Mythic tab in **Settings** to track tier, path, mythic power, surge die (with feat upgrades) and Mythic Paragon. Mythic hit points, Amazing Initiative and ability score increases feed into the rest of the sheet.
- **Companions (optional).** Turn on the Companions tab in **Settings** for familiars, animal companions, eidolons and other creatures. Animal companions and familiars follow their core progression tables from the master's class level; others use hit dice with creature-type math.
- **Spells.** Each casting class gets its own "[Class] Spells" section; add more (including "Other" for racial or item spells) from **Settings**.
- **Edit mode and info.** Each section's pencil button reveals its add, reorder, remove and database-search controls; values are always editable. The **ℹ** button collects every breakdown and rule note that's otherwise only in hover tooltips, so it works on phones too.
- **Configurable.** Collapse any section, or hide it on screen or in print (the gear tab, **Settings**). Dark mode follows your system until you toggle it in Settings; printing always uses the light theme. Printed dynamic tables include one blank row for handwritten additions.
- **Multiple characters.** Create, duplicate and switch between characters. Use **Export JSON** for backups.
- **Offline.** It's a PWA: after the first visit it runs with no network connection.

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

`public/data/*.json` is generated from the [Foundry VTT PF1 system](https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1) compendium packs (OGL 1.0a content):

```sh
mkdir /tmp/pf1 && cd /tmp/pf1
curl -L -o packs.tar.gz "https://gitlab.com/api/v4/projects/foundryvtt_pathfinder1e%2Ffoundryvtt-pathfinder1/repository/archive.tar.gz?sha=master&path=packs"
tar xzf packs.tar.gz
curl -o foundryvtt-*/OGL.txt "https://gitlab.com/api/v4/projects/foundryvtt_pathfinder1e%2Ffoundryvtt-pathfinder1/repository/files/OGL.txt/raw?ref=master"
cd -
pnpm import-data /tmp/pf1/foundryvtt-*/packs
```

## Legal

This website uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's Community Use Policy. It is not published, endorsed, or specifically approved by Paizo. The rules data is Open Game Content under the Open Game License v1.0a. The license text is in the app's **About** dialog and in `public/data/OGL.txt`.
