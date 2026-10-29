<script lang="ts">
  import { tick } from 'svelte';
  import { fmt } from '../ui/format';
  import { roll, rolls } from './rolls.svelte';

  const DICE = [4, 6, 8, 10, 12, 20, 100];
  const MAX_COUNT = 50;

  /** A dice group with its flat modifier, e.g. 1d6+2. */
  interface Group {
    terms: string[];
    modifier: number;
  }

  /** Dice picked in the tray right now (not yet added as a group). */
  let counts = $state<Record<number, number>>({});
  let customCount = $state(0);
  /** Sides of the custom die; blank until the user types them. */
  let customSides = $state<number | null>(null);
  let modifierInput = $state(0);
  /** Committed groups, in the order they were added with Add. */
  let groups = $state<Group[]>([]);
  let list: HTMLOListElement | undefined = $state();

  const customOk = $derived(customSides !== null && Number.isInteger(customSides) && customSides >= 2 && customSides <= 1000);
  const pendingTerms = $derived([
    ...DICE.filter((d) => counts[d] > 0).map((d) => `${counts[d]}d${d}`),
    ...(customCount > 0 && customOk ? [`${customCount}d${customSides}`] : []),
  ]);
  const hasPending = $derived(pendingTerms.length > 0);
  /** Committed groups plus whatever is picked right now. */
  const all = $derived<Group[]>(hasPending ? [...groups, { terms: pendingTerms, modifier: 0 }] : groups);

  const groupText = (g: Group) => g.terms.join('+') + (g.modifier ? (g.modifier > 0 ? `+${g.modifier}` : `${g.modifier}`) : '');
  /** Several groups read as (1d6+2)+(3d4+4); one group reads plainly. */
  const expression = $derived(all.length > 1 ? all.map((g) => `(${groupText(g)})`).join('+') : all.length ? groupText(all[0]) : '');
  const notation = $derived(all.map(groupText).join('+'));

  function bump(sides: number, by: number) {
    counts[sides] = Math.max(0, Math.min(MAX_COUNT, (counts[sides] ?? 0) + by));
  }
  function clearPending() {
    counts = {};
    customCount = 0;
  }
  /** Commit the picked dice as a group with the modifier typed next to Add. */
  function addModifier() {
    if (!hasPending) return;
    groups = [...groups, { terms: pendingTerms, modifier: Number.isFinite(modifierInput) ? Math.trunc(modifierInput) : 0 }];
    clearPending();
    modifierInput = 0;
  }
  function rollTray() {
    if (!notation) return;
    void roll({ title: notation, notation });
    groups = [];
    clearPending();
    modifierInput = 0;
  }
  function resetTray() {
    groups = [];
    clearPending();
    modifierInput = 0;
  }

  // Newest at the bottom, like a chat: keep it scrolled to the end.
  $effect(() => {
    void rolls.entries.length;
    if (rolls.open) tick().then(() => list?.scrollTo({ top: list.scrollHeight }));
  });

  const time = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  // Everything a critical multiplies sits in brackets, followed by the multiplier.
  const partsText = (r: { parts: { source: string; value: number }[]; modifier: number; multiplier?: number }) => {
    const text = r.parts.length ? r.parts.map((p) => `${fmt(p.value)} ${p.source}`).join(' · ') : r.modifier ? `${fmt(r.modifier)} modifier` : '';
    if (!text) return '';
    return r.multiplier && r.multiplier !== 1 ? `(${text}) ×${r.multiplier}` : text;
  };
</script>

{#if rolls.open}
  <div class="fixed inset-0 z-40 bg-ink/40 print:hidden" role="presentation" onclick={() => rolls.toggle(false)}></div>
  <aside class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-paper shadow-xl print:hidden" aria-label="Roll log">
    <div class="flex items-center gap-2 border-b border-ink/20 px-4 py-2">
      <h2 class="font-display text-lg font-bold">Rolls</h2>
      {#if rolls.entries.length}
        <button type="button" class="btn ml-auto text-xs" onclick={() => rolls.clear()}>Clear</button>
      {/if}
      <button type="button" class={['icon-btn', { 'ml-auto': !rolls.entries.length }]} aria-label="Close" onclick={() => rolls.toggle(false)}>✕</button>
    </div>

    <ol bind:this={list} class="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3" aria-live="polite">
      {#each rolls.entries as r (r.id)}
        {@const mixed = new Set(r.dice.map((d) => d.sides)).size > 1}
        <li class="rounded-md border border-ink/15 bg-parchment/60 px-3 py-2" data-roll data-total={r.total} data-dice={r.dice.map((d) => d.value).join(',')}>
          <div class="flex items-baseline gap-2">
            <span class="font-semibold">{r.title}</span>
            {#if r.subtitle}<span class="text-xs opacity-60">{r.subtitle}</span>{/if}
            <time class="ml-auto text-xs opacity-50" datetime={new Date(r.at).toISOString()}>{time(r.at)}</time>
            <button type="button" class="icon-btn size-5 text-accent" aria-label="Delete roll {r.title}" title="Delete this roll" onclick={() => rolls.remove(r.id)}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true"><path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5A1 1 0 0 0 7.7 16.5h4.6a1 1 0 0 0 1-.9L14 6M8.5 9v4.5M11.5 9v4.5" /></svg>
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-1">
            <span class="font-mono text-xs opacity-60">{r.notation}</span>
            {#each r.dice as d, i (i)}
              <span
                class={['chip min-w-6 justify-center gap-0.5 font-bold tabular-nums', { 'bg-gold text-paper': d.sides === 20 && d.value === 20, 'bg-accent text-paper': d.sides === 20 && d.value === 1 }]}
                title="d{d.sides}"
              >
                {#if mixed}<span class="text-[0.6rem] font-normal opacity-70">d{d.sides}</span>{/if}
                {d.sign < 0 ? '-' : ''}{d.value}
              </span>
            {/each}
            <span class="ml-auto text-2xl font-bold tabular-nums">{r.total}</span>
          </div>
          {#if partsText(r)}<div class="text-xs opacity-70">{partsText(r)}</div>{/if}
        </li>
      {:else}
        <li class="text-sm italic opacity-50">Click a number on the sheet (initiative, saves, attacks, skills…) or build a roll in the tray below.</li>
      {/each}
    </ol>

    <!-- Tray at the bottom: pick dice, add a modifier to each group, then roll them together. -->
    <div class="flex flex-col gap-2 border-t border-ink/20 px-4 py-3" role="group" aria-label="Dice tray">
      <div class="grid grid-cols-3 gap-2">
        {#each DICE as sides (sides)}
          <div class="flex items-center overflow-hidden rounded-sm border border-ink/30">
            <button type="button" class="px-1.5 py-0.5 text-sm hover:bg-ink/10 disabled:opacity-30" aria-label="Remove a d{sides}" disabled={!counts[sides]} onclick={() => bump(sides, -1)}>−</button>
            <span class="min-w-5 text-center text-sm font-semibold tabular-nums" aria-label="{counts[sides] ?? 0} d{sides}">{counts[sides] ?? 0}</span>
            <button type="button" class="px-1.5 py-0.5 text-sm hover:bg-ink/10 disabled:opacity-30" aria-label="Add a d{sides}" disabled={(counts[sides] ?? 0) >= MAX_COUNT} onclick={() => bump(sides, 1)}>+</button>
            <span class="border-l border-ink/30 px-1.5 py-0.5 text-sm font-bold">d{sides}</span>
          </div>
        {/each}
        <div class="flex items-center overflow-hidden rounded-sm border border-ink/30" role="group" aria-label="Custom die">
          <button type="button" class="px-1.5 py-0.5 text-sm hover:bg-ink/10 disabled:opacity-30" aria-label="Remove a custom die" disabled={customCount <= 0} onclick={() => (customCount = Math.max(0, customCount - 1))}>−</button>
          <span class="min-w-5 text-center text-sm font-semibold tabular-nums" aria-label="{customCount} custom die">{customCount}</span>
          <button type="button" class="px-1.5 py-0.5 text-sm hover:bg-ink/10 disabled:opacity-30" aria-label="Add a custom die" disabled={customCount >= MAX_COUNT} onclick={() => (customCount = Math.min(MAX_COUNT, customCount + 1))}>+</button>
          <span class="border-l border-ink/30 px-1.5 py-0.5 text-sm font-bold">d</span>
          <input
            class="w-0 min-w-0 flex-1 border-0 border-l border-ink/30 bg-field px-1 py-0.5 text-sm font-bold tabular-nums placeholder:text-[0.65rem] placeholder:font-normal placeholder:opacity-60"
            type="number"
            min="2"
            max="1000"
            placeholder="sides"
            bind:value={customSides}
            aria-label="Custom die sides"
            title="Type the number of sides (rolled instantly, no 3D)"
          />
        </div>
        <div class="flex items-center justify-end gap-1.5">
          <label class="flex items-center gap-1 text-sm">
            +
            <input class="w-12 text-right" type="number" bind:value={modifierInput} aria-label="Modifier" />
          </label>
          <button type="button" class="btn text-xs" disabled={!hasPending} onclick={addModifier} title="Add these dice as a group with this modifier">Add</button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="min-w-0 flex-1 truncate font-mono text-xs opacity-70" title={expression}>{expression || 'Choose dice above'}</span>
        <button type="button" class="btn text-xs" disabled={!all.length && !modifierInput} onclick={resetTray}>Reset</button>
        <button type="button" class="btn-primary text-sm" disabled={!notation || rolls.busy} onclick={rollTray}>Roll</button>
      </div>
    </div>
  </aside>
{/if}
