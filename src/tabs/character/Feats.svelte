<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';

  const c = $derived(app.char);
  // One feat at 1st level and every odd level after.
  const expected = $derived(Math.ceil(app.d.level / 2));
  const general = $derived(c.feats.filter((f) => !/bonus/i.test(f.source)).length);

  function sortByLevel() {
    c.feats.sort((a, b) => a.level - b.level);
  }
</script>

<Section id="feats">
  {#snippet actions()}
    <span class="text-xs" title="Feats from character level (excludes bonus feats)">{general}/{expected} level feats</span>
    <button type="button" class="rounded-sm px-1.5 text-xs hover:bg-paper/20" onclick={sortByLevel}>Sort</button>
  {/snippet}
  <DynamicTable bind:items={c.feats} cols={4} onadd={() => c.feats.push(make.feat(Math.max(1, app.d.level)))} addLabel="Feat" empty="No feats yet.">
    {#snippet head()}
      <th class="text-center">Lvl</th>
      <th>Feat</th>
      <th>Source</th>
      <th>Notes</th>
    {/snippet}
    {#snippet row(f)}
      <td class="w-10"><NumInput bind:value={f.level} aria-label="Level gained" /></td>
      <td class="w-2/5"><input class="font-semibold" bind:value={f.name} aria-label="Feat name" /></td>
      <td class="w-24"><input list="feat-sources" bind:value={f.source} aria-label="Source" /></td>
      <td><textarea rows="1" class="w-full" bind:value={f.description} aria-label="Notes"></textarea></td>
    {/snippet}
  </DynamicTable>
  <datalist id="feat-sources">
    <option value="Level"></option><option value="Human bonus"></option><option value="Fighter bonus"></option>
    <option value="Class bonus"></option><option value="Racial"></option><option value="Item"></option>
  </datalist>
</Section>
