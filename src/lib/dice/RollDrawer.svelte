<script lang="ts">
  import { tick } from 'svelte';
  import NumInput from '../ui/NumInput.svelte';
  import { fmt } from '../ui/format';
  import { roll, rolls } from './rolls.svelte';

  const DICE = [4, 6, 8, 10, 12, 20, 100];
  let count = $state(1);
  let list: HTMLOListElement | undefined = $state();

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

    <!-- Quick tray: the standard seven-dice set. -->
    <div class="flex flex-wrap items-center gap-1 border-b border-ink/20 px-4 py-2" role="group" aria-label="Quick roll">
      <NumInput class="w-12" bind:value={count} aria-label="Number of dice" />
      <span class="text-sm opacity-60">×</span>
      {#each DICE as sides (sides)}
        <button
          type="button"
          class="btn px-2 py-0.5 font-bold tabular-nums"
          disabled={rolls.busy}
          onclick={() => roll({ title: `${Math.max(1, Math.min(100, count))}d${sides}`, notation: `${Math.max(1, Math.min(100, count))}d${sides}` })}>d{sides}</button
        >
      {/each}
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
        <li class="text-sm italic opacity-50">Click a number on the sheet (initiative, saves, attacks, skills…) or use the tray above.</li>
      {/each}
    </ol>
  </aside>
{/if}
