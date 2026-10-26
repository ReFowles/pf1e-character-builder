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
  const info = $derived(app.char.info);
</script>

<Section id="info">
  <div class="grid grid-cols-2 gap-x-3 gap-y-1">
    <Field label="Character name"><input class="text-lg font-bold" bind:value={info.name} /></Field>
    <Field label="Player"><input bind:value={info.player} /></Field>
  </div>
  <div class="grid grid-cols-[4.25rem_minmax(0,1fr)_3.25rem_minmax(0,1fr)] gap-x-2 gap-y-1">
    <Field label="Align.">
      <select bind:value={info.alignment} aria-label="Alignment" title={ALIGNMENTS.find(([a]) => a === info.alignment)?.[1]}>
        <option value=""></option>
        {#each ALIGNMENTS as [a, name] (a)}<option value={a} title={name}>{a}</option>{/each}
      </select>
    </Field>
    <Field label="Race"><input bind:value={info.race} /></Field>
    <Field label="Size">
      <!-- Closed, the select shows just the size letter; the open list keeps full names. -->
      <div class="relative" title={info.size}>
        <select class="w-full text-transparent capitalize" bind:value={info.size} aria-label="Size">
          {#each SIZES as s (s)}<option value={s} class="text-ink">{s}</option>{/each}
        </select>
        <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 font-semibold" aria-hidden="true">{info.size[0].toUpperCase()}</span>
      </div>
    </Field>
    <Field label="Deity"><input bind:value={info.deity} /></Field>
  </div>
  <div class="flex flex-col">
    <Chips bind:items={info.languages} suggestions={LANGUAGES} placeholder="Add language…" label="Add language" />
    <span class="field-label">Languages</span>
  </div>
</Section>
