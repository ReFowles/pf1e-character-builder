<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { parseGp } from '../../lib/model/migrate';
  import { MAGIC_SLOTS, type Item, type MagicSlot } from '../../lib/model/types';
  import { carriedItems } from '../../lib/rules/derive';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import DbPicker from '../../lib/ui/DbPicker.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import { gp, lb } from '../../lib/ui/format';
  import Select, { opts } from '../../lib/ui/Select.svelte';

  const c = $derived(app.char);
  const d = $derived(app.d);
  const COINS = ['pp', 'gp', 'sp', 'cp'] as const;

  const parentOf = (it: Item) => (it.containerId && c.items.some((x) => x.id === it.containerId) ? it.containerId : null);

  /** Items in tree order (containers followed by their contents) with depth. */
  const tree = $derived.by(() => {
    const children = new Map<string | null, Item[]>();
    for (const it of c.items) children.set(parentOf(it), [...(children.get(parentOf(it)) ?? []), it]);
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
    // Contents fall out to wherever the container was.
    for (const ch of c.items.filter((i) => i.containerId === it.id)) ch.containerId = it.containerId;
    c.items.splice(c.items.indexOf(it), 1);
  }

  /** Swap with the previous/next item in the same container. */
  function move(it: Item, dir: -1 | 1) {
    const siblings = c.items.filter((x) => parentOf(x) === parentOf(it));
    const other = siblings[siblings.indexOf(it) + dir];
    if (!other) return;
    const a = c.items.indexOf(it);
    const b = c.items.indexOf(other);
    [c.items[a], c.items[b]] = [c.items[b], c.items[a]];
  }
  const isEdge = (it: Item, dir: -1 | 1) => {
    const siblings = c.items.filter((x) => parentOf(x) === parentOf(it));
    return !siblings[siblings.indexOf(it) + dir];
  };

  const toSlot = (s: string): MagicSlot | '' => {
    const slot = s === 'wrists' ? 'wrist' : s;
    return (MAGIC_SLOTS as readonly string[]).includes(slot) ? (slot as MagicSlot) : '';
  };
</script>

<Section id="equipment" editable>
  {#snippet info()}
    <p>Carried weight counts weapons, armor, gear and coins. Items in a weightless container (bag of holding) or marked away (on a mount, at home) don't count, nor do their contents.</p>
    <p>Value counts everything you own, carried or not, including stashed coins (1 pp = 10 gp, 1 sp = 0.1 gp, 1 cp = 0.01 gp).</p>
    <p>Mark an item equipped and give it a slot to list it under Magic Items. Load: {d.load} (light up to {d.capacity.light} lb, medium up to {d.capacity.medium} lb, heavy up to {d.capacity.heavy} lb).</p>
  {/snippet}
  <div class="grid grid-cols-3 gap-1 text-center text-sm sm:grid-cols-6">
    <div class="stat"><div class="font-bold">{d.capacity.light}</div><div class="field-label">Light load</div></div>
    <div class="stat"><div class="font-bold">{d.capacity.medium}</div><div class="field-label">Medium load</div></div>
    <div class="stat"><div class="font-bold">{d.capacity.heavy}</div><div class="field-label">Heavy load</div></div>
    <div class="stat"><div class="font-bold">{d.capacity.liftOverHead}</div><div class="field-label">Over head</div></div>
    <div class="stat"><div class="font-bold">{d.capacity.liftOffGround}</div><div class="field-label">Off ground</div></div>
    <div class="stat"><div class="font-bold">{d.capacity.pushDrag}</div><div class="field-label">Push/drag</div></div>
  </div>

  <EditMode>
    {#snippet children(editing)}
      <table class="dyn-table print:hidden">
        <thead>
          <tr>
            <th>Item</th>
            <th class="text-center">Qty</th>
            <th class="text-center">Wt</th>
            <th class="text-center">Total</th>
            <th class="text-center" title="Value of one, in gp">gp ea.</th>
            <th>Notes</th>
            {#if editing}
              <th>In</th>
              <th>Flags</th>
              <th><span class="sr-only">Actions</span></th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each tree as { item: it, depth } (it.id)}
            <tr class:opacity-50={!counted.has(it.id)}>
              <td data-label="Item" style:padding-left="{depth * 1.1 + 0.15}rem" class="min-w-36 align-middle">
                <div class="flex items-center gap-1">
                  {#if depth}<span class="opacity-40">└</span>{/if}
                  <input class="w-full" class:font-semibold={it.isContainer} bind:value={it.name} aria-label="Item name" />
                  {#if it.equipped}<span class="text-xs text-gold" title="Equipped{it.slot ? ` (${it.slot})` : ''}">◆</span>{/if}
                </div>
              </td>
              <td data-label="Qty" class="w-12 align-middle"><NumInput bind:value={it.quantity} aria-label="Quantity" /></td>
              <td data-label="Wt" class="w-12 align-middle"><NumInput bind:value={it.weight} aria-label="Weight each" /></td>
              <td data-label="Total" class="w-14 text-center align-middle text-xs whitespace-nowrap tabular-nums">
                {Math.round(it.weight * it.quantity * 100) / 100}
                {#if it.isContainer}<div class="opacity-60" title="Contents">+{Math.round(contentsWeight(it.id) * 100) / 100}</div>{/if}
              </td>
              <td data-label="gp ea." class="w-16 align-middle"><NumInput bind:value={it.price} aria-label="Value each in gp" /></td>
              <td data-label="Notes" class="align-middle"><input class="w-full" bind:value={it.notes} aria-label="Notes" /></td>
              {#if editing}
                <td data-label="In" class="w-28 align-middle">
                  <Select
                    class="w-full"
                    bind:value={it.containerId}
                    options={[
                      { value: null, label: '—' },
                      ...containers.filter((k) => !descendants(it.id).has(k.id)).map((k) => ({ value: k.id, label: k.name || 'Container' })),
                    ]}
                    aria-label="Inside container"
                  />
                </td>
                <td data-label="Flags" class="align-middle">
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <label class="inline-flex items-center gap-1" title="Is a container"><input type="checkbox" bind:checked={it.isContainer} />Container</label>
                    {#if it.isContainer}
                      <label class="inline-flex items-center gap-1" title="Contents weigh nothing (bag of holding)"><input type="checkbox" bind:checked={it.weightless} />Weightless</label>
                    {/if}
                    <label class="inline-flex items-center gap-1" title="Not on the character (mount, camp, home)"><input type="checkbox" bind:checked={it.notCarried} />Away</label>
                    <label class="inline-flex items-center gap-1" title="Worn or wielded"><input type="checkbox" bind:checked={it.equipped} />Equipped</label>
                    <Select class="h-6 w-24 text-xs" bind:value={it.slot} options={[{ value: '' as const, label: 'No slot' }, ...opts(MAGIC_SLOTS)]} aria-label="Magic item slot" />
                  </div>
                </td>
                <td class="row-actions align-middle whitespace-nowrap">
                  <button type="button" class="icon-btn" aria-label="Move {it.name} up" disabled={isEdge(it, -1)} onclick={() => move(it, -1)}>↑</button>
                  <button type="button" class="icon-btn" aria-label="Move {it.name} down" disabled={isEdge(it, 1)} onclick={() => move(it, 1)}>↓</button>
                  {#if it.isContainer}<button type="button" class="icon-btn" title="Add item inside" aria-label="Add item inside {it.name}" onclick={() => addItem(it.id)}>＋</button>{/if}
                  <button type="button" class="icon-btn text-accent" aria-label="Remove {it.name}" onclick={() => remove(it)}>✕</button>
                </td>
              {/if}
            </tr>
          {:else}
            <tr><td colspan="9" class="py-2 text-center text-sm italic opacity-60">No gear yet.</td></tr>
          {/each}
        </tbody>
      </table>

      <!-- On paper: two columns of gear, plus room to write more. -->
      <ul class="hidden columns-2 gap-4 text-sm print:block">
        {#each tree as { item: it, depth } (it.id)}
          <li class="flex break-inside-avoid justify-between border-b border-ink/15 py-0.5" style:padding-left="{depth}rem" class:opacity-60={!counted.has(it.id)}>
            <span>{it.name}{it.quantity !== 1 ? ` ×${it.quantity}` : ''}</span>
            <span class="tabular-nums">{Math.round(it.weight * it.quantity * 100) / 100} lb</span>
          </li>
        {/each}
        {#each { length: 4 }, i (i)}<li class="h-5 break-inside-avoid border-b border-ink/25"></li>{/each}
      </ul>

      {#if editing}
        <div class="flex flex-wrap items-start gap-2 print:hidden">
          <button type="button" class="add-btn" onclick={() => addItem()}>+ Item</button>
          <DbPicker
            kind="items"
            label="Find gear or magic item"
            filter={(it) => !it.weapon && !it.armor}
            onpick={(it) => {
              const slot = it.category === 'magic' ? toSlot(it.slot) || 'slotless' : '';
              c.items.push({ ...make.item(), name: it.name, weight: it.weight, price: parseGp(it.price), isContainer: it.category === 'container', slot, equipped: !!slot });
            }}
          >
            {#snippet detail(it)}{it.category}{it.slot ? ` · ${it.slot}` : ''} · {it.weight} lb · {it.price}{/snippet}
          </DbPicker>
        </div>
      {/if}

      <div class="grid grid-cols-1 gap-3 border-t border-ink/20 pt-2 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <div class="subhead">Currency</div>
          <table class="w-full text-sm">
            <thead>
              <tr>
                <th>Where</th>
                {#each COINS as coin (coin)}<th class="text-center">{coin}</th>{/each}
                {#if editing}<th title="Weightless (bank, bag of holding)" class="print:hidden">∅wt</th><th class="print:hidden"></th>{/if}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-xs font-semibold">Carried</td>
                {#each COINS as coin (coin)}<td><NumInput bind:value={c.currency.carried[coin]} aria-label="{coin} carried" /></td>{/each}
              </tr>
              {#each c.currency.locations as loc, i (loc.id)}
                <tr>
                  <td><input class="w-full text-xs" bind:value={loc.name} placeholder="Location" aria-label="Location" /></td>
                  {#each COINS as coin (coin)}<td><NumInput bind:value={loc.coins[coin]} aria-label="{coin} at {loc.name}" /></td>{/each}
                  {#if editing}
                    <td class="text-center print:hidden"><input type="checkbox" bind:checked={loc.weightless} aria-label="Weightless" /></td>
                    <td class="print:hidden"><button type="button" class="icon-btn text-accent" aria-label="Remove location" onclick={() => c.currency.locations.splice(i, 1)}>✕</button></td>
                  {/if}
                </tr>
              {/each}
              <tr class="print-row hidden print:table-row"><td></td><td></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
          {#if editing}
            <button type="button" class="add-btn print:hidden" onclick={() => c.currency.locations.push(make.coinLocation())}>+ Stash / pouch</button>
          {/if}
        </div>

        <div class="flex flex-col gap-1 text-sm">
          <div class="subhead">Carried weight & value</div>
          <table class="w-full tabular-nums" aria-label="Carried weight and value">
            <thead>
              <tr><th></th><th class="text-right" title="What you carry">Weight</th><th class="text-right" title="Everything you own">Value</th></tr>
            </thead>
            <tbody>
              {#each [['Weapons', 'weapons'], ['Armor & shields', 'armor'], ['Gear', 'items'], ['Coins', 'coins']] as const as [label, key] (key)}
                <tr class="border-b border-ink/10">
                  <td>{label}</td>
                  <td class="text-right">{lb(d.weight[key])}</td>
                  <td class="text-right">{gp(d.wealth[key])}</td>
                </tr>
              {/each}
              <tr class="font-bold">
                <td>Total</td>
                <td class="text-right">{lb(d.weight.total)} <span class="font-normal capitalize" class:text-accent={d.load !== 'light'}>({d.load})</span></td>
                <td class="text-right" title="Everything owned, carried or not">{gp(d.wealth.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    {/snippet}
  </EditMode>
</Section>
