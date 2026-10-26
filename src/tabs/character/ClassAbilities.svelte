<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import Select from '../../lib/ui/Select.svelte';

  const c = $derived(app.char);

  function add() {
    const k = c.classes.find((x) => x.id === c.levels.at(-1)?.classId) ?? c.classes[0];
    c.classAbilities.push(make.classAbility(k?.id ?? '', k ? app.d.classLevels[k.id] || 1 : 1));
  }

  function sort() {
    const order = new Map(c.classes.map((k, i) => [k.id, i]));
    c.classAbilities.sort((a, b) => (order.get(a.classId) ?? 99) - (order.get(b.classId) ?? 99) || a.level - b.level);
  }
</script>

<Section id="classAbilities" editable>
  {#snippet info()}
    <p>Record class features as you gain them, with the class level they arrived at. Sort groups them by class, then level.</p>
    <p>Abilities with limited uses also belong in Special Abilities on the Core tab, where uses can be tracked.</p>
  {/snippet}
  {#snippet actions()}
    <EditMode>{#snippet children(editing)}{#if editing}<button type="button" class="head-btn" onclick={sort}>Sort</button>{/if}{/snippet}</EditMode>
  {/snippet}
  <DynamicTable bind:items={c.classAbilities} cols={4} onadd={add} addLabel="Class ability" empty="Bravery, Sneak Attack, Bloodline powers…">
    {#snippet head()}
      <th>Class</th>
      <th class="text-center">Lvl</th>
      <th>Ability</th>
      <th>Notes</th>
    {/snippet}
    {#snippet row(a)}
      <td data-label="Class" class="w-24">
        <Select bind:value={a.classId} options={[{ value: '', label: '—' }, ...c.classes.map((k) => ({ value: k.id, label: k.name || 'Unnamed' }))]} aria-label="Class" />
      </td>
      <td data-label="Lvl" class="w-10"><NumInput bind:value={a.level} aria-label="Class level gained" /></td>
      <td data-label="Ability" class="w-2/5"><input class="font-semibold" bind:value={a.name} aria-label="Ability name" /></td>
      <td data-label="Notes"><textarea rows="1" class="w-full" bind:value={a.description} aria-label="Notes"></textarea></td>
    {/snippet}
  </DynamicTable>
</Section>
