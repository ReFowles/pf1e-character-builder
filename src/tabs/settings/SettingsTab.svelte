<script lang="ts">
  import { app, type Tab } from '../../lib/state.svelte';
  import { theme } from '../../lib/theme.svelte';
  import { SECTIONS, TAB_LABELS } from '../../lib/sections';
  import { addSpellBlock, removeSpellBlock, spellSectionId, spellSectionTitle } from '../../lib/spellBlocks';
  import { addCompanion, companionSectionId, companionTitle, removeCompanion } from '../../lib/companions';
  import Section from '../../lib/ui/Section.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';
  import FormulaGuide from './FormulaGuide.svelte';
  import AboutDialog from '../../lib/ui/AboutDialog.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import { prefs } from '../../lib/prefs.svelte';
  import { roll } from '../../lib/dice/rolls.svelte';
  import { tour } from '../../lib/tour.svelte';

  let about: AboutDialog;
  const c = $derived(app.char);

  /** Sections listed under a tab; spell and companion sections come from the character. */
  const rowsFor = (tab: Tab): { id: string; title: string }[] =>
    tab === 'spells'
      ? c.spellcasting.map((b) => ({ id: spellSectionId(b), title: spellSectionTitle(c, b) }))
      : tab === 'companions'
        ? c.companions.map((x) => ({ id: companionSectionId(x), title: companionTitle(x) }))
        : SECTIONS.filter((s) => s.tab === tab);
  const sheetTabs = $derived(app.tabs.filter((t) => t !== 'settings'));
</script>

<!-- Device and character settings as cards; never printed (see App.svelte). -->
<div class="grid items-start gap-3 sm:grid-cols-2">
  <div class="flex flex-col gap-3">
  <Section id="settings-help" title="Help & data">
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn" onclick={() => app.exportJson()}>Export JSON</button>
      <button type="button" class="btn" onclick={() => app.importJson()}>Import JSON</button>
      <button type="button" class="btn" onclick={() => about.open()}>About & licenses</button>
      <button type="button" class="btn" onclick={() => tour.start()}>Show the walkthrough again</button>
    </div>
    <p class="text-sm opacity-70">Characters are saved in this browser. Export a JSON backup before clearing site data or switching devices.</p>
  </Section>
  <Section id="settings-appearance" title="Appearance">
    <label class="flex items-center gap-2 text-sm" title="Saved on this device. Printing always uses the light theme.">
      <input type="checkbox" bind:checked={() => theme.dark, (v) => (theme.dark = v)} />
      Dark mode
    </label>
  </Section>
  <Section id="settings-rules" title="Rules">
    <label class="field">
      <Select bind:value={c.xp.track} options={opts(['slow', 'medium', 'fast'] as const)} aria-label="Experience track" />
      <span class="field-label">Experience track</span>
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={c.maxHpFirstLevel} />
      Max hit points at first level
    </label>
    <label class="field">
      <Select
        bind:value={c.critMode}
        options={[
          { value: 'total' as const, label: 'Multiply the total' },
          { value: 'dice' as const, label: 'Multiply the dice' },
        ]}
        aria-label="Critical hit rule"
      />
      <span class="field-label">Critical hits</span>
    </label>
    <p class="text-xs opacity-70">
      {c.critMode === 'total' ? 'Roll the damage normally, then multiply the whole total (×2, ×3…).' : 'Roll the dice multiplied (×2 means twice as many dice), with the bonus multiplied too.'}
    </p>
  </Section>
  <Section id="settings-tabs" title="Tabs">
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={c.mythic.enabled} />
      Mythic tab
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={c.companionTab} />
      Companions tab (familiars, animal companions, eidolons…)
    </label>
  </Section>
  </div>
  <div class="flex flex-col gap-3">
  <Section id="settings-dice" title="Dice">
    <p class="text-sm opacity-70">Click initiative, saves, attacks, skills, ability modifiers or caster level to roll; weapons roll damage and criticals. Results go to the roll log (the d20 button in the header). Saved on this device.</p>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={prefs.dice.threeD} />
      3D dice (physics-based, loads about 2 MB the first time)
    </label>
    <div class="flex flex-wrap items-end gap-3">
      <label class="field w-28">
        <input type="color" class="h-7 w-full cursor-pointer p-0.5" bind:value={prefs.dice.color} aria-label="Dice colour" />
        <span class="field-label">Dice colour</span>
      </label>
      <label class="field w-20">
        <NumInput bind:value={prefs.dice.scale} aria-label="Dice size (2 to 9)" />
        <span class="field-label">Size (2–9)</span>
      </label>
      <button type="button" class="btn" onclick={() => roll({ title: 'Test roll', notation: '2d20+1d6' })}>Test roll</button>
    </div>
  </Section>
  <Section id="settings-spells" title="Spellcasting sections">
    <ul class="flex flex-col gap-1 text-sm">
      {#each c.spellcasting as b (b.id)}
        <li class="flex items-center gap-1">
          {spellSectionTitle(c, b)}
          <button type="button" class="icon-btn size-5 text-accent" aria-label="Remove {spellSectionTitle(c, b)}" title="Remove section" onclick={() => removeSpellBlock(c, b.id)}>✕</button>
        </li>
      {:else}
        <li class="italic opacity-60">None yet.</li>
      {/each}
    </ul>
    <button type="button" class="add-btn self-start" onclick={() => addSpellBlock(c)}>+ Spellcasting section</button>
  </Section>
  <Section id="settings-companions" title="Companions">
    <ul class="flex flex-col gap-1 text-sm">
      {#each c.companions as x (x.id)}
        <li class="flex items-center gap-1">
          {companionTitle(x)}
          <button type="button" class="icon-btn size-5 text-accent" aria-label="Remove {companionTitle(x)}" title="Remove companion" onclick={() => removeCompanion(c, x.id)}>✕</button>
        </li>
      {:else}
        <li class="italic opacity-60">None yet.</li>
      {/each}
    </ul>
    <button
      type="button"
      class="add-btn self-start"
      onclick={() => {
        c.companionTab = true;
        addCompanion(c);
      }}>+ Companion</button
    >
  </Section>
  </div>
</div>
<div class="mt-3">
  <Section id="settings-layout" title="Layout & print">
    {#snippet actions()}
      <button
        type="button"
        class="head-btn px-2"
        title="Show every section on screen and in print again"
        onclick={() => {
          c.ui.sections = { macros: { hidden: false, collapsed: false, printHidden: true }, 'tab:notes': { hidden: false, collapsed: false, printHidden: true } };
        }}>Reset layout</button
      >
    {/snippet}
    <p class="text-sm opacity-70">Hide a section on screen or leave it out of the printed sheet. Collapse sections with the chevron in their header.</p>
    <div class="grid gap-3 sm:grid-cols-2">
      {#each sheetTabs as tab (tab)}
        <table class="w-full self-start text-sm">
          <thead>
            <tr>
              <th>{TAB_LABELS[tab]} tab</th>
              <th class="w-14 text-center">Screen</th>
              <th class="w-14 text-center">Print</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-ink/10">
              <td class="italic">Whole tab</td>
              <td></td>
              <td class="text-center">
                <input
                  type="checkbox"
                  aria-label="Print {tab} tab"
                  checked={!app.section(`tab:${tab}`).printHidden}
                  onchange={(e) => app.setSection(`tab:${tab}`, { printHidden: !e.currentTarget.checked })}
                />
              </td>
            </tr>
            {#each rowsFor(tab) as s (s.id)}
              {@const ui = app.section(s.id)}
              <tr class="border-b border-ink/10">
                <td>{s.title}</td>
                <td class="text-center">
                  <input type="checkbox" aria-label="Show {s.title} on screen" checked={!ui.hidden} onchange={(e) => app.setSection(s.id, { hidden: !e.currentTarget.checked })} />
                </td>
                <td class="text-center">
                  <input type="checkbox" aria-label="Print {s.title}" checked={!ui.printHidden} onchange={(e) => app.setSection(s.id, { printHidden: !e.currentTarget.checked })} />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/each}
    </div>
  </Section>
</div>
<div class="mt-3">
  <FormulaGuide />
</div>
<AboutDialog bind:this={about} />
