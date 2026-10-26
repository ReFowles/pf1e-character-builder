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

<Section {id} editable>
  {#snippet info()}
    <p>{empty} Use Edit to add, reorder or remove entries.</p>
  {/snippet}
  <DynamicTable bind:items cols={3} onadd={() => items.push(make.mythicEntry(numberLabel === 'Tier' ? app.char.mythic.tier : 1))} {addLabel} {empty}>
    {#snippet head()}
      <th class="text-center">{numberLabel}</th>
      <th>{nameLabel}</th>
      <th>Notes</th>
    {/snippet}
    {#snippet row(e)}
      <td data-label={numberLabel} class="w-12"><NumInput bind:value={e.tier} aria-label={numberLabel} /></td>
      <td data-label={nameLabel} class="w-2/5"><input class="w-full font-semibold" bind:value={e.name} aria-label={nameLabel} /></td>
      <td data-label="Notes"><textarea rows="1" class="w-full" bind:value={e.notes} aria-label="Notes"></textarea></td>
    {/snippet}
  </DynamicTable>
</Section>
