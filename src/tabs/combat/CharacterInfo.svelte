<script lang="ts">
  import { SIZES } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import Chips from '../../lib/ui/Chips.svelte';

  const ALIGNMENTS = ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'];
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
  <div class="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
    <Field label="Alignment">
      <input list="alignments" bind:value={info.alignment} />
      <datalist id="alignments">{#each ALIGNMENTS as a (a)}<option value={a}></option>{/each}</datalist>
    </Field>
    <Field label="Race"><input bind:value={info.race} /></Field>
    <Field label="Size">
      <select class="capitalize" bind:value={info.size}>
        {#each SIZES as s (s)}<option value={s}>{s}</option>{/each}
      </select>
    </Field>
    <Field label="Deity"><input bind:value={info.deity} /></Field>
  </div>
  <div class="flex flex-col">
    <Chips bind:items={info.languages} suggestions={LANGUAGES} placeholder="Add language…" label="Add language" />
    <span class="field-label">Languages</span>
  </div>
</Section>
