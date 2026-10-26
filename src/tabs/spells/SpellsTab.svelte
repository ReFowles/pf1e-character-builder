<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { PRESET_BY_ID } from '../../lib/rules/classPresets';
  import { PRESET_SPELL_TABLE, SPELL_TABLE_BY_ID } from '../../lib/rules/spellTables';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import CastingBlock from './CastingBlock.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';

  const c = $derived(app.char);

  function addBlock() {
    const used = new Set(c.spellcasting.map((b) => b.classId));
    // Prefer a casting class that doesn't have a block yet.
    const k =
      c.classes.find((x) => !used.has(x.id) && (x.castingAbility || PRESET_SPELL_TABLE[x.presetId ?? ''])) ??
      c.classes.find((x) => !used.has(x.id));
    const block = make.spellcasting();
    if (k) {
      block.classId = k.id;
      const preset = PRESET_BY_ID[k.presetId ?? ''];
      block.ability = k.castingAbility ?? preset?.castingAbility ?? 'int';
      block.table = PRESET_SPELL_TABLE[k.presetId ?? ''] ?? '';
      block.kind = SPELL_TABLE_BY_ID[block.table]?.kind ?? 'prepared';
      block.domainSlot = k.presetId === 'cleric';
    }
    c.spellcasting.push(block);
  }

  function remove(i: number) {
    const b = c.spellcasting[i];
    if (b.spells.length && !confirm(`Remove this spellcasting block and its ${b.spells.length} spells?`)) return;
    c.spellcasting.splice(i, 1);
  }
</script>

<div class="sheet-grid spells-grid">
  <Section id="spellcasting" editable>
    {#snippet info()}
      <p>Add a block for each casting class (or "Other" for racial or item spellcasting). Linked spell tables fill in slots by class level; Manual lets you enter slots for every level.</p>
      <p><strong>Per day</strong> = base slots + bonus spells from a high ability score + misc. Cantrips and orisons (level 0) can be cast any number of times; the number shown in Prepared is how many you can prepare.</p>
      <p><strong>Domain slots</strong> (clerics) add one spell per level that must come from a domain; they're counted separately.</p>
      <p><strong>Save DC</strong> = 10 + spell level + ability modifier. <strong>Spell penetration</strong> = caster level + bonuses, rolled against spell resistance.</p>
    {/snippet}
    <EditMode>{#snippet children(editing)}
    {#each c.spellcasting as block, i (block.id)}
      <CastingBlock {block} onremove={() => remove(i)} />
    {:else}
      <p class="text-sm italic opacity-60 print:hidden">No spellcasting yet. Add a block for each casting class.</p>
    {/each}
    {#if editing}<button type="button" class="add-btn print:hidden" onclick={addBlock}>+ Spellcasting class</button>{/if}
    {/snippet}</EditMode>
  </Section>
</div>
