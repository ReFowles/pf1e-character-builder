<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';

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

<Section id="classAbilities">
  {#snippet actions()}
    <button type="button" class="rounded-sm px-1.5 text-xs hover:bg-paper/20" onclick={sort}>Sort</button>
  {/snippet}
  <DynamicTable bind:items={c.classAbilities} cols={4} onadd={add} addLabel="Class ability" empty="Bravery, Sneak Attack, Bloodline powers…">
    {#snippet head()}
      <th>Class</th>
      <th class="text-center">Lvl</th>
      <th>Ability</th>
      <th>Notes</th>
    {/snippet}
    {#snippet row(a)}
      <td class="w-24">
        <select bind:value={a.classId} aria-label="Class">
          <option value="">—</option>
          {#each c.classes as k (k.id)}<option value={k.id}>{k.name || 'Unnamed'}</option>{/each}
        </select>
      </td>
      <td class="w-10"><NumInput bind:value={a.level} aria-label="Class level gained" /></td>
      <td class="w-2/5"><input class="font-semibold" bind:value={a.name} aria-label="Ability name" /></td>
      <td><textarea rows="1" class="w-full" bind:value={a.description} aria-label="Notes"></textarea></td>
    {/snippet}
  </DynamicTable>
</Section>
