<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import type { MythicEntry } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';

  interface Props {
    id: string;
    items: MythicEntry[];
    /** Column label for the number: "Tier" or "Level". */
    numberLabel?: string;
    nameLabel: string;
    addLabel: string;
    empty: string;
  }
  let { id, items = $bindable(), numberLabel = 'Tier', nameLabel, addLabel, empty }: Props = $props();
</script>

<Section {id}>
  <DynamicTable bind:items cols={3} onadd={() => items.push(make.mythicEntry(numberLabel === 'Tier' ? app.char.mythic.tier : 1))} {addLabel} {empty}>
    {#snippet head()}
      <th class="text-center">{numberLabel}</th>
      <th>{nameLabel}</th>
      <th>Notes</th>
    {/snippet}
    {#snippet row(e)}
      <td class="w-12"><NumInput bind:value={e.tier} aria-label={numberLabel} /></td>
      <td class="w-2/5"><input class="w-full font-semibold" bind:value={e.name} aria-label={nameLabel} /></td>
      <td><textarea rows="1" class="w-full" bind:value={e.notes} aria-label="Notes"></textarea></td>
    {/snippet}
  </DynamicTable>
</Section>
