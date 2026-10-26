<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import type { Item } from '../../lib/model/types';
  import { carriedItems } from '../../lib/rules/derive';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import { lb } from '../../lib/ui/format';
  import DbPicker from '../../lib/ui/DbPicker.svelte';

  const c = $derived(app.char);
  const d = $derived(app.d);
  const COINS = ['pp', 'gp', 'sp', 'cp'] as const;

  /** Items in tree order (containers followed by their contents) with depth. */
  const tree = $derived.by(() => {
    const ids = new Set(c.items.map((i) => i.id));
    const children = new Map<string | null, Item[]>();
    for (const it of c.items) {
      const parent = it.containerId && ids.has(it.containerId) ? it.containerId : null;
      children.set(parent, [...(children.get(parent) ?? []), it]);
    }
    const out: { item: Item; depth: number }[] = [];
    const seen = new Set<string>();
    const walk = (parent: string | null, depth: number) => {
      for (const it of children.get(parent) ?? []) {
        if (seen.has(it.id)) continue;
        seen.add(it.id);
        out.push({ item: it, depth });
        walk(it.id, depth + 1);
      }
    };
    walk(null, 0);
    // Anything caught in a containment cycle still gets shown.
    for (const it of c.items) if (!seen.has(it.id)) out.push({ item: it, depth: 0 });
    return out;
  });

  const counted = $derived(new Set(carriedItems(c.items).map((i) => i.id)));
  const containers = $derived(c.items.filter((i) => i.isContainer));

  function descendants(id: string): Set<string> {
    const out = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const it of c.items)
        if (it.containerId && out.has(it.containerId) && !out.has(it.id)) {
          out.add(it.id);
          grew = true;
        }
    }
    return out;
  }

  function contentsWeight(id: string) {
    const inside = descendants(id);
    inside.delete(id);
    return c.items.filter((i) => inside.has(i.id)).reduce((s, i) => s + i.weight * i.quantity, 0);
  }

  function addItem(containerId: string | null = null) {
    c.items.push({ ...make.item(), containerId });
  }

  function remove(it: Item) {
    const contents = c.items.filter((i) => i.containerId === it.id);
    // Contents fall out to wherever the container was.
    for (const ch of contents) ch.containerId = it.containerId;
    c.items.splice(c.items.indexOf(it), 1);
  }
</script>

<Section id="equipment">
  <div class="overflow-x-auto">
    <table class="dyn-table">
      <thead>
        <tr>
          <th>Item</th>
          <th class="text-center">Qty</th>
          <th class="text-center">Wt</th>
          <th class="text-center">Total</th>
          <th class="print:hidden">In</th>
          <th class="print:hidden" title="Container / weightless contents / not carried">Flags</th>
          <th>Value / notes</th>
          <th class="print:hidden"></th>
        </tr>
      </thead>
      <tbody>
        {#each tree as { item: it, depth } (it.id)}
          <tr class:opacity-50={!counted.has(it.id)}>
            <td style:padding-left="{depth * 1.1 + 0.15}rem" class="min-w-36">
              <div class="flex items-center gap-1">
                {#if depth}<span class="opacity-40">└</span>{/if}
                <input class:font-semibold={it.isContainer} bind:value={it.name} aria-label="Item name" />
              </div>
            </td>
            <td class="w-12"><NumInput bind:value={it.quantity} aria-label="Quantity" /></td>
            <td class="w-12"><NumInput bind:value={it.weight} aria-label="Weight each" /></td>
            <td class="w-16 text-center text-xs whitespace-nowrap tabular-nums">
              {Math.round(it.weight * it.quantity * 100) / 100}
              {#if it.isContainer}<div class="opacity-60" title="Contents">+{Math.round(contentsWeight(it.id) * 100) / 100}</div>{/if}
            </td>
            <td class="w-24 print:hidden">
              <select bind:value={it.containerId} aria-label="Inside container">
                <option value={null}>—</option>
                {#each containers.filter((k) => !descendants(it.id).has(k.id)) as k (k.id)}
                  <option value={k.id}>{k.name || 'Container'}</option>
                {/each}
              </select>
            </td>
            <td class="whitespace-nowrap print:hidden">
              <label class="mr-1 text-xs" title="Is a container"><input type="checkbox" bind:checked={it.isContainer} /> box</label>
              {#if it.isContainer}
                <label class="mr-1 text-xs" title="Contents weigh nothing (bag of holding)"><input type="checkbox" bind:checked={it.weightless} /> ∅wt</label>
              {/if}
              <label class="text-xs" title="Not on the character (mount, camp, home)"><input type="checkbox" bind:checked={it.notCarried} /> away</label>
            </td>
            <td><input bind:value={it.notes} aria-label="Value or notes" /></td>
            <td class="whitespace-nowrap print:hidden">
              {#if it.isContainer}<button type="button" class="icon-btn" title="Add item inside" aria-label="Add item inside {it.name}" onclick={() => addItem(it.id)}>＋</button>{/if}
              <button type="button" class="icon-btn text-accent" aria-label="Remove {it.name}" onclick={() => remove(it)}>✕</button>
            </td>
          </tr>
        {:else}
          <tr class="print:hidden"><td colspan="8" class="py-2 text-center text-sm italic opacity-60">No gear yet.</td></tr>
        {/each}
        <tr class="print-row hidden print:table-row">{#each { length: 5 }, i (i)}<td></td>{/each}</tr>
      </tbody>
    </table>
  </div>
  <div class="flex flex-wrap items-start gap-2">
    <button type="button" class="add-btn print:hidden" onclick={() => addItem()}>+ Item</button>
    <div class="min-w-60 flex-1">
      <DbPicker
        kind="items"
        label="Find gear"
        filter={(it) => !it.weapon && !it.armor && it.category !== 'magic'}
        onpick={(it) =>
          c.items.push({ ...make.item(), name: it.name, weight: it.weight, notes: it.price, isContainer: it.category === 'container' })}
      >
        {#snippet detail(it)}{it.category} · {it.weight} lb · {it.price}{/snippet}
      </DbPicker>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-3 border-t border-ink/20 pt-2 sm:grid-cols-2">
    <div class="flex flex-col gap-1">
      <div class="subhead">Currency</div>
      <table class="w-full text-sm">
        <thead>
          <tr>
            <th>Where</th>
            {#each COINS as coin (coin)}<th class="text-center">{coin}</th>{/each}
            <th title="Weightless (bank, bag of holding)" class="print:hidden">∅wt</th>
            <th class="print:hidden"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-xs font-semibold">Carried</td>
            {#each COINS as coin (coin)}<td><NumInput bind:value={c.currency.carried[coin]} aria-label="{coin} carried" /></td>{/each}
            <td class="print:hidden"></td><td class="print:hidden"></td>
          </tr>
          {#each c.currency.locations as loc, i (loc.id)}
            <tr>
              <td><input class="w-full text-xs" bind:value={loc.name} placeholder="Location" aria-label="Location" /></td>
              {#each COINS as coin (coin)}<td><NumInput bind:value={loc.coins[coin]} aria-label="{coin} at {loc.name}" /></td>{/each}
              <td class="text-center print:hidden"><input type="checkbox" bind:checked={loc.weightless} aria-label="Weightless" /></td>
              <td class="print:hidden"><button type="button" class="icon-btn text-accent" aria-label="Remove location" onclick={() => c.currency.locations.splice(i, 1)}>✕</button></td>
            </tr>
          {/each}
          <tr class="print-row hidden print:table-row"><td></td><td></td><td></td><td></td><td></td></tr>
        </tbody>
      </table>
      <button type="button" class="add-btn print:hidden" onclick={() => c.currency.locations.push(make.coinLocation())}>+ Stash / pouch</button>
    </div>

    <div class="flex flex-col gap-1 text-sm">
      <div class="subhead">Carrying capacity</div>
      <div class="grid grid-cols-3 gap-1 text-center">
        <div class="stat"><div class="font-bold">{d.capacity.light}</div><div class="field-label">Light</div></div>
        <div class="stat"><div class="font-bold">{d.capacity.medium}</div><div class="field-label">Medium</div></div>
        <div class="stat"><div class="font-bold">{d.capacity.heavy}</div><div class="field-label">Heavy</div></div>
        <div class="stat"><div class="font-bold">{d.capacity.liftOverHead}</div><div class="field-label">Over head</div></div>
        <div class="stat"><div class="font-bold">{d.capacity.liftOffGround}</div><div class="field-label">Off ground</div></div>
        <div class="stat"><div class="font-bold">{d.capacity.pushDrag}</div><div class="field-label">Push/drag</div></div>
      </div>
      <div class="subhead mt-1">Carried weight</div>
      <dl class="grid grid-cols-[1fr_auto] gap-x-2 tabular-nums">
        <dt>Weapons</dt><dd>{lb(d.weight.weapons)}</dd>
        <dt>Armor & shields</dt><dd>{lb(d.weight.armor)}</dd>
        <dt>Magic items</dt><dd>{lb(d.weight.magicItems)}</dd>
        <dt>Gear</dt><dd>{lb(d.weight.items)}</dd>
        <dt>Coins</dt><dd>{lb(d.weight.coins)}</dd>
        <dt class="font-bold">Total</dt>
        <dd class="font-bold">{lb(d.weight.total)} <span class="capitalize" class:text-accent={d.load !== 'light'}>({d.load})</span></dd>
      </dl>
    </div>
  </div>
</Section>
