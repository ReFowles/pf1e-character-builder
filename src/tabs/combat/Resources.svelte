<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import FormulaInput from '../../lib/ui/FormulaInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';

  const c = $derived(app.char);
</script>

<Section id="resources">
  {#snippet actions()}
    <button
      type="button"
      class="rounded-sm px-1.5 text-xs hover:bg-paper/20"
      title="Refill every pool to its maximum"
      onclick={() => c.resources.forEach((r) => (r.current = app.d.resources[r.id] ?? r.max))}>Refill</button
    >
  {/snippet}
  <DynamicTable bind:items={c.resources} cols={4} onadd={() => c.resources.push(make.resource())} addLabel="Pool" empty="Grit, Panache, Arcane Pool, Ki, Burn…">
    {#snippet head()}
      <th>Pool</th>
      <th class="text-center">Current</th>
      <th class="text-center">Max</th>
      <th>Notes</th>
    {/snippet}
    {#snippet row(r)}
      <td class="min-w-24"><input class="font-semibold" bind:value={r.name} aria-label="Pool name" /></td>
      <td class="w-20">
        <div class="flex items-center">
          <button type="button" class="icon-btn print:hidden" aria-label="Spend one" onclick={() => (r.current = Math.max(0, r.current - 1))}>−</button>
          <NumInput class="font-bold print:invisible" bind:value={r.current} aria-label="{r.name} current" />
          <button type="button" class="icon-btn print:hidden" aria-label="Gain one" onclick={() => r.current++}>+</button>
        </div>
      </td>
      <td class="w-16"><FormulaInput bind:value={r.max} bind:expr={r.maxExpr} result={app.d.resources[r.id] ?? r.max} label="{r.name} max" /></td>
      <td><input bind:value={r.notes} aria-label="Notes" /></td>
    {/snippet}
  </DynamicTable>
</Section>
