<script lang="ts">
  import type { Item, MagicSlot } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';

  // Body slots in sheet order; two ring slots.
  const SLOTS: { slot: MagicSlot; index: number }[] = (
    ['head', 'headband', 'eyes', 'shoulders', 'neck', 'chest', 'body', 'belt', 'wrist', 'hands', 'ring', 'ring', 'feet'] as MagicSlot[]
  ).map((slot, i, all) => ({ slot, index: all.slice(0, i).filter((s) => s === slot).length }));

  /** Equipped gear, grouped by slot. */
  const bySlot = $derived.by(() => {
    const out = new Map<string, Item[]>();
    for (const it of app.char.items) {
      if (!it.equipped || !it.slot) continue;
      out.set(it.slot, [...(out.get(it.slot) ?? []), it]);
    }
    return out;
  });
  const slotless = $derived(bySlot.get('slotless') ?? []);
</script>

<Section id="magicItems">
  {#snippet info()}
    <p>Magic items come from your gear. In Equipment's edit mode, give an item a slot and mark it equipped to list it here.</p>
  {/snippet}
  <table class="w-full text-sm">
    <tbody>
      {#each SLOTS as s (s.slot + s.index)}
        {@const items = bySlot.get(s.slot) ?? []}
        {@const shown = s.slot === 'ring' ? items.slice(s.index, s.index + 1) : s.index === 0 ? items : []}
        <tr class="border-b border-ink/10">
          <th class="w-20 py-1 text-right align-middle">{s.slot}</th>
          <td class="py-1 pl-2 align-middle">{shown.map((it) => it.name).join(', ')}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <div class="subhead mt-1">Slotless</div>
  <ul class="text-sm">
    {#each slotless as it (it.id)}<li class="border-b border-ink/10 py-1">{it.name}</li>{/each}
    <li class="hidden h-6 border-b border-ink/20 print:block"></li>
  </ul>
</Section>
