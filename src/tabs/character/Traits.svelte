<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';

  const c = $derived(app.char);
</script>

<Section id="traits" editable>
  {#snippet info()}
    <p>Most characters choose two character traits at creation (often from different categories) and may take a drawback for a third. Racial traits come from your race.</p>
    <p>Traits don't change numbers automatically; add a macro or a misc bonus for any that grant one.</p>
  {/snippet}
  <DynamicTable bind:items={c.traits} cols={4} empty="No traits.">
    {#snippet head()}
      <th>Trait</th>
      <th>Kind</th>
      <th>Category</th>
      <th>Description</th>
    {/snippet}
    {#snippet row(t)}
      <td data-label="Trait" class="w-1/4"><input class="font-semibold" bind:value={t.name} aria-label="Trait name" /></td>
      <td data-label="Kind" class="w-24">
        <Select bind:value={t.kind} options={opts(['character', 'racial', 'drawback'] as const)} aria-label="Kind" />
      </td>
      <td data-label="Category" class="w-24"><input bind:value={t.category} placeholder="Combat, Faith…" aria-label="Category" /></td>
      <td data-label="Description"><textarea rows="1" class="w-full" bind:value={t.description} aria-label="Description"></textarea></td>
    {/snippet}
    {#snippet tools()}
      <button type="button" class="add-btn" onclick={() => c.traits.push(make.trait('character'))}>+ Character trait</button>
      <button type="button" class="add-btn" onclick={() => c.traits.push(make.trait('racial'))}>+ Racial trait</button>
    {/snippet}
  </DynamicTable>
</Section>
