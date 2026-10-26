<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import type { MagicItem, MagicSlot } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';

  const c = $derived(app.char);
  // Body slots in sheet order; two ring slots.
  const SLOTS: { slot: MagicSlot; index: number; label: string }[] = [
    'head', 'headband', 'eyes', 'shoulders', 'neck', 'chest', 'body', 'belt', 'wrist', 'hands', 'ring', 'ring', 'feet',
  ].map((slot, i, all) => ({
    slot: slot as MagicSlot,
    index: all.slice(0, i).filter((s) => s === slot).length,
    label: slot,
  }));

  const slotless = $derived(c.magicItems.filter((m) => m.slot === 'slotless'));

  function inSlot(slot: MagicSlot, index: number): MagicItem | undefined {
    return c.magicItems.filter((m) => m.slot === slot)[index];
  }

  function setName(slot: MagicSlot, index: number, name: string) {
    const existing = inSlot(slot, index);
    if (existing) {
      if (name.trim() || existing.weight || existing.notes) existing.name = name;
      else c.magicItems.splice(c.magicItems.indexOf(existing), 1);
    } else if (name.trim()) {
      c.magicItems.push({ ...make.magicItem(), slot, name });
    }
  }
</script>

<Section id="magicItems">
  <table class="w-full text-sm">
    <tbody>
      {#each SLOTS as s (s.slot + s.index)}
        {@const item = inSlot(s.slot, s.index)}
        <tr class="border-b border-ink/10">
          <th class="w-16 py-0.5 text-right">{s.label}</th>
          <td>
            <input class="w-full" value={item?.name ?? ''} onchange={(e) => setName(s.slot, s.index, e.currentTarget.value)} aria-label="{s.label} slot item" />
          </td>
          <td class="w-10">
            {#if item}<NumInput bind:value={item.weight} aria-label="{s.label} item weight" />{/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="subhead mt-1">Slotless</div>
  <DynamicTable items={slotless} cols={2} reorder={false} onremove={(m) => c.magicItems.splice(c.magicItems.indexOf(m), 1)} onadd={() => c.magicItems.push(make.magicItem())} addLabel="Slotless item" empty="Ioun stones, wondrous items…">
    {#snippet head()}
      <th>Item</th>
      <th class="text-center">Wt</th>
    {/snippet}
    {#snippet row(m)}
      <td><input bind:value={m.name} aria-label="Item name" /></td>
      <td class="w-10"><NumInput bind:value={m.weight} aria-label="Weight" /></td>
    {/snippet}
  </DynamicTable>
</Section>
