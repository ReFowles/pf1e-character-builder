<script lang="ts">
  import { SIZES } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import Chips from '../../lib/ui/Chips.svelte';
  import Combobox from '../../lib/ui/Combobox.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';

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
  // Official races to pick from; the field still accepts any text for homebrew.
  const RACES = [
    'Dwarf', 'Elf', 'Gnome', 'Half-Elf', 'Half-Orc', 'Halfling', 'Human',
    'Aasimar', 'Catfolk', 'Dhampir', 'Drow', 'Fetchling', 'Goblin', 'Hobgoblin', 'Ifrit', 'Kobold',
    'Orc', 'Oread', 'Ratfolk', 'Sylph', 'Tengu', 'Tiefling', 'Undine',
    'Changeling', 'Duergar', 'Gillman', 'Grippli', 'Kitsune', 'Merfolk', 'Nagaji', 'Samsaran',
    'Strix', 'Suli', 'Svirfneblin', 'Vanara', 'Vishkanya', 'Wayang',
  ];
  const ci = $derived(app.char.info);
  // Size-changing effects (Enlarge/Reduce Person) move the effective size; the select sets the base.
  const effective = $derived(app.d.effectiveSize);
  const shifted = $derived(effective !== ci.size);
</script>

<Section id="info" editable>
  {#snippet info()}
    <p><strong>Size</strong> ({effective}{shifted ? `, base ${ci.size}` : ''}) changes AC and attack rolls, CMB and CMD, Fly and Stealth, and carrying capacity. Active size effects like Enlarge Person change the displayed size; set the base size here.</p>
    <p>Languages can be added, renamed or removed in Edit mode.</p>
  {/snippet}
  <div class="grid grid-cols-2 gap-x-3 gap-y-1">
    <Field label="Character name"><input class="text-lg font-bold" bind:value={ci.name} /></Field>
    <Field label="Player"><input bind:value={ci.player} /></Field>
  </div>
  <div class="grid grid-cols-[4.25rem_minmax(0,1fr)_3.25rem_minmax(0,1fr)] gap-x-2 gap-y-1">
    <Field label="Align.">
      <Select
        bind:value={ci.alignment}
        aria-label="Alignment"
        options={[{ value: '', label: '—' }, ...ALIGNMENTS.map(([a, name]) => ({ value: a, label: a, title: name }))]}
      />
    </Field>
    <Field label="Race"><Combobox bind:value={ci.race} suggestions={RACES} placeholder="Race" aria-label="Race" /></Field>
    <Field label="Size">
      <!-- Closed, the select shows just the effective size letter; the open list sets the base size. -->
      <Select bind:value={ci.size} options={opts(SIZES)} aria-label="Size" title={shifted ? `${effective} (base ${ci.size})` : effective}>
        {#snippet display()}<span class="font-semibold {shifted ? 'text-accent' : ''}">{effective[0].toUpperCase()}</span>{/snippet}
      </Select>
    </Field>
    <Field label="Deity"><input bind:value={ci.deity} /></Field>
  </div>
  <div class="flex flex-col">
    <Chips bind:items={ci.languages} suggestions={LANGUAGES} placeholder="Add language…" label="Add language" />
    <span class="field-label">Languages</span>
  </div>
</Section>
