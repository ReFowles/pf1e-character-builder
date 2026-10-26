<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';

  const c = $derived(app.char);
</script>

<Section id="traits">
  <DynamicTable bind:items={c.traits} cols={4} empty="No traits.">
    {#snippet head()}
      <th>Trait</th>
      <th>Kind</th>
      <th>Category</th>
      <th>Description</th>
    {/snippet}
    {#snippet row(t)}
      <td class="w-1/4"><input class="font-semibold" bind:value={t.name} aria-label="Trait name" /></td>
      <td class="w-24">
        <select bind:value={t.kind} aria-label="Kind">
          <option value="character">Character</option>
          <option value="racial">Racial</option>
          <option value="drawback">Drawback</option>
        </select>
      </td>
      <td class="w-24"><input bind:value={t.category} placeholder="Combat, Faith…" aria-label="Category" /></td>
      <td><textarea rows="1" class="w-full" bind:value={t.description} aria-label="Description"></textarea></td>
    {/snippet}
  </DynamicTable>
  <div class="flex gap-2 print:hidden">
    <button type="button" class="add-btn" onclick={() => c.traits.push(make.trait('character'))}>+ Character trait</button>
    <button type="button" class="add-btn" onclick={() => c.traits.push(make.trait('racial'))}>+ Racial trait</button>
  </div>
</Section>
