<script lang="ts">
  import { tick } from 'svelte';
  import { fmt } from '../ui/format';
  import { roll, rolls } from './rolls.svelte';

  const DICE = [4, 6, 8, 10, 12, 20, 100];
  const MAX_COUNT = 50;
  /** Dice in the tray: how many of each. */
  let counts = $state<Record<number, number>>({});
  let list: HTMLOListElement | undefined = $state();

  /** The custom die: its own count and sides (typed in). */
  let customCount = $state(0);
  let customSides = $state(10);
  const customOk = $derived(Number.isInteger(customSides) && customSides >= 2 && customSides <= 1000);

  const terms = $derived([
    ...DICE.filter((d) => counts[d] > 0).map((d) => `${counts[d]}d${d}`),
    ...(customCount > 0 && customOk ? [`${customCount}d${customSides}`] : []),
  ]);
  const notation = $derived(terms.join('+'));
  const total = $derived(DICE.reduce((n, d) => n + (counts[d] ?? 0), 0) + (customOk ? customCount : 0));

  function bump(sides: number, by: number) {
    counts[sides] = Math.max(0, Math.min(MAX_COUNT, (counts[sides] ?? 0) + by));
  }
  function rollTray() {
    if (!notation) return;
    void roll({ title: notation, notation });
    resetTray();
  }
  function resetTray() {
    counts = {};
    customCount = 0;
  }

  // Newest at the bottom, like a chat: keep it scrolled to the end.
  $effect(() => {
    void rolls.entries.length;
    if (rolls.open) tick().then(() => list?.scrollTo({ top: list.scrollHeight }));
  });

  const time = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  // Everything a critical multiplies sits in brackets, followed by the multiplier.
  const partsText = (r: { parts: { source: string; value: number }[]; modifier: number; multiplier?: number }) => {
    const list = r.parts.length ? r.parts.map((p) => `${fmt(p.value)} ${p.source}`).join(' · ') : r.modifier ? `${fmt(r.modifier)} modifier` : '';
    if (!list) return '';
    return r.multiplier && r.multiplier !== 1 ? `(${list}) ×${r.multiplier}` : list;
  };
</script>

{#if rolls.open}
  <div class="fixed inset-0 z-40 bg-ink/40 print:hidden" role="presentation" onclick={() => rolls.toggle(false)}></div>
  <aside class="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-paper shadow-xl print:hidden" aria-label="Roll log">
    <div class="flex items-center gap-2 border-b border-ink/20 px-4 py-2">
      <h2 class="font-display text-lg font-bold">Rolls</h2>
      {#if rolls.entries.length}
        <button type="button" class="btn ml-auto text-xs" onclick={() => rolls.clear()}>Clear</button>
      {/if}
      <button type="button" class={['icon-btn', { 'ml-auto': !rolls.entries.length }]} aria-label="Close" onclick={() => rolls.toggle(false)}>✕</button>
    </div>

    <ol bind:this={list} class="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3" aria-live="polite">
      {#each rolls.entries as r (r.id)}
        <li class="rounded-md border border-ink/15 bg-parchment/60 px-3 py-2" data-roll data-total={r.total} data-dice={r.dice.map((d) => d.value).join(',')}>
          <div class="flex items-baseline gap-2">
            <span class="font-semibold">{r.title}</span>
            {#if r.subtitle}<span class="text-xs opacity-60">{r.subtitle}</span>{/if}
            <time class="ml-auto text-xs opacity-50" datetime={new Date(r.at).toISOString()}>{time(r.at)}</time>
          </div>
          <div class="flex flex-wrap items-center gap-1">
            <span class="font-mono text-xs opacity-60">{r.notation}</span>
            {#each r.dice as d, i (i)}
              <span
                class={['chip min-w-6 justify-center font-bold tabular-nums', { 'bg-gold text-paper': d.sides === 20 && d.value === 20, 'bg-accent text-paper': d.sides === 20 && d.value === 1 }]}
                title="d{d.sides}">{d.sign < 0 ? '-' : ''}{d.value}</span
              >
            {/each}
            <span class="ml-auto text-2xl font-bold tabular-nums">{r.total}</span>
          </div>
          {#if partsText(r)}<div class="text-xs opacity-70">{partsText(r)}</div>{/if}
        </li>
      {:else}
        <li class="text-sm italic opacity-50">Click a number on the sheet (initiative, saves, attacks, skills…) or build a roll in the tray below.</li>
      {/each}
    </ol>

    <!-- Tray at the bottom: pick dice, then roll them together (2d6+3d4). -->
    <div class="flex flex-col gap-2 border-t border-ink/20 px-4 py-3" role="group" aria-label="Dice tray">
      <div class="grid grid-cols-3 gap-2">
        {#each DICE as sides (sides)}
          {@render stepper(counts[sides] ?? 0, `d${sides}`, `d${sides}`, () => bump(sides, -1), () => bump(sides, 1))}
        {/each}
        <div class="flex items-center overflow-hidden rounded-sm border border-ink/30" role="group" aria-label="Custom die">
          {@render stepperButtons(customCount, `custom die`, () => (customCount = Math.max(0, customCount - 1)), () => (customCount = Math.min(MAX_COUNT, customCount + 1)))}
          <span class="border-l border-ink/30 px-1 py-0.5 text-sm font-bold">d</span>
          <input
            class="w-12 min-w-0 border-0 bg-transparent px-1 py-0.5 text-sm font-bold tabular-nums"
            type="number"
            min="2"
            max="1000"
            bind:value={customSides}
            aria-label="Custom die sides"
            title="Sides of the custom die (rolled instantly, no 3D)"
          />
        </div>
        <div class="flex items-center justify-end gap-1">
          <button type="button" class="btn text-xs" disabled={!total} onclick={() => resetTray()}>Reset</button>
          <button type="button" class="btn-primary text-sm" disabled={!total || rolls.busy} onclick={rollTray}>Roll</button>
        </div>
      </div>
      <span class="truncate font-mono text-xs opacity-70" title={notation}>{notation || 'Choose dice above'}</span>
    </div>
  </aside>
{/if}

{#snippet stepperButtons(count: number, name: string, dec: () => void, inc: () => void)}
  <button type="button" class="px-1.5 py-0.5 text-sm hover:bg-ink/10 disabled:opacity-30" aria-label="Remove a {name}" disabled={count <= 0} onclick={dec}>−</button>
  <span class="min-w-5 text-center text-sm font-semibold tabular-nums" aria-label="{count} {name}">{count}</span>
  <button type="button" class="px-1.5 py-0.5 text-sm hover:bg-ink/10 disabled:opacity-30" aria-label="Add a {name}" disabled={count >= MAX_COUNT} onclick={inc}>+</button>
{/snippet}

{#snippet stepper(count: number, label: string, name: string, dec: () => void, inc: () => void)}
  <div class="flex items-center overflow-hidden rounded-sm border border-ink/30">
    {@render stepperButtons(count, name, dec, inc)}
    <span class="border-l border-ink/30 px-1.5 py-0.5 text-sm font-bold">{label}</span>
  </div>
{/snippet}
