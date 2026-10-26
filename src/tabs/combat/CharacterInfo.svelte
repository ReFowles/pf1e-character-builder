<script lang="ts">
  import { SIZES } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import Chips from '../../lib/ui/Chips.svelte';

  const ALIGNMENTS: [string, string][] = [
    ['LG', 'Lawful good'], ['NG', 'Neutral good'], ['CG', 'Chaotic good'],
    ['LN', 'Lawful neutral'], ['N', 'Neutral'], ['CN', 'Chaotic neutral'],
    ['LE', 'Lawful evil'], ['NE', 'Neutral evil'], ['CE', 'Chaotic evil'],
  ];
  const LANGUAGES = [
    'Common', 'Abyssal', 'Aklo', 'Aquan', 'Auran', 'Celestial', 'Draconic', 'Druidic', 'Dwarven',
    'Elven', 'Giant', 'Gnome', 'Goblin', 'Gnoll', 'Halfling', 'Ignan', 'Infernal', 'Orc', 'Sylvan',
    'Terran', 'Undercommon',
  ];
  const ci = $derived(app.char.info);
</script>

<Section id="info" editable>
  {#snippet info()}
    <p><strong>Size</strong> ({ci.size}) changes AC and attack rolls, CMB and CMD, Fly and Stealth, and carrying capacity.</p>
    <p>Languages can be added, renamed or removed in Edit mode.</p>
  {/snippet}
  <div class="grid grid-cols-2 gap-x-3 gap-y-1">
    <Field label="Character name"><input class="text-lg font-bold" bind:value={ci.name} /></Field>
    <Field label="Player"><input bind:value={ci.player} /></Field>
  </div>
  <div class="grid grid-cols-[4.25rem_minmax(0,1fr)_3.25rem_minmax(0,1fr)] gap-x-2 gap-y-1">
    <Field label="Align.">
      <select bind:value={ci.alignment} aria-label="Alignment" title={ALIGNMENTS.find(([a]) => a === ci.alignment)?.[1]}>
        <option value=""></option>
        {#each ALIGNMENTS as [a, name] (a)}<option value={a} title={name}>{a}</option>{/each}
      </select>
    </Field>
    <Field label="Race"><input bind:value={ci.race} /></Field>
    <Field label="Size">
      <!-- Closed, the select shows just the size letter; the open list keeps full names. -->
      <div class="relative" title={ci.size}>
        <select class="w-full text-transparent capitalize" bind:value={ci.size} aria-label="Size">
          {#each SIZES as s (s)}<option value={s} class="text-ink">{s}</option>{/each}
        </select>
        <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 font-semibold" aria-hidden="true">{ci.size[0].toUpperCase()}</span>
      </div>
    </Field>
    <Field label="Deity"><input bind:value={ci.deity} /></Field>
  </div>
  <div class="flex flex-col">
    <Chips bind:items={ci.languages} suggestions={LANGUAGES} placeholder="Add language…" label="Add language" />
    <span class="field-label">Languages</span>
  </div>
</Section>
