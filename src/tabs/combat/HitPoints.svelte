<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import FormulaInput from '../../lib/ui/FormulaInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';
  import { breakdown } from '../../lib/ui/format';

  const c = $derived(app.char);
  const hp = $derived(app.d.hp);
  let amount = $state(0);

  function damage() {
    const absorbed = Math.min(c.hp.temp, amount);
    c.hp.temp -= absorbed;
    c.hp.damage += amount - absorbed;
    amount = 0;
  }
  function heal() {
    c.hp.damage = Math.max(0, c.hp.damage - amount);
    c.hp.nonlethal = Math.max(0, c.hp.nonlethal - amount);
    amount = 0;
  }
  const status = $derived(
    hp.current <= -app.d.abilities.con.tempScore
      ? 'Dead'
      : hp.current < 0
        ? 'Dying'
        : hp.current === 0
          ? 'Disabled'
          : c.hp.nonlethal >= hp.current
            ? c.hp.nonlethal === hp.current
              ? 'Staggered'
              : 'Unconscious'
            : '',
  );
</script>

<Section id="hp">
  <label class="flex items-center gap-2">
    <span class="field-label text-[0.65rem]">Temporary hit points</span>
    <NumInput class="w-14" bind:value={c.hp.temp} />
  </label>

  <div class="relative grid grid-cols-[1fr_2.5rem_1fr] items-center rounded-sm border-2 border-ink px-1 py-2">
    <div class="flex flex-col items-center">
      <input
        class="h-14 w-full border-0 bg-transparent text-center text-5xl leading-none font-bold tabular-nums print:invisible"
        class:text-accent={hp.current <= hp.max.total / 4}
        inputmode="numeric"
        aria-label="Current hit points"
        value={hp.current}
        onchange={(e) => {
          const v = Number(e.currentTarget.value);
          if (Number.isFinite(v)) c.hp.damage = hp.max.total + c.hp.temp - v;
          e.currentTarget.value = String(app.d.hp.current);
        }}
      />
      <span class="field-label">Current{status ? ` — ${status}` : ''}</span>
    </div>
    <svg class="h-14 w-full text-ink" viewBox="0 0 40 56" preserveAspectRatio="none" aria-hidden="true">
      <line x1="34" y1="2" x2="6" y2="54" stroke="currentColor" stroke-width="1.5" />
    </svg>
    <div class="flex flex-col items-center" title={breakdown(hp.max)}>
      <span class="text-5xl leading-[3rem] font-bold tabular-nums">{hp.max.total}</span>
      <span class="field-label">Max HP</span>
    </div>
  </div>

  <label class="flex items-center gap-2">
    <span class="field-label text-[0.65rem]">Nonlethal damage</span>
    <NumInput class="w-14" bind:value={c.hp.nonlethal} />
  </label>

  <div class="flex items-center gap-1 print:hidden">
    <NumInput class="w-14" bind:value={amount} aria-label="Damage or healing amount" />
    <button type="button" class="btn" onclick={damage}>Damage</button>
    <button type="button" class="btn" onclick={heal}>Heal</button>
    <button type="button" class="btn ml-auto" onclick={() => ((c.hp.damage = 0), (c.hp.nonlethal = 0))}>Full heal</button>
  </div>
  <div class="print:hidden"><BonusList keys={['hp.max']} label="Extra max HP (e.g. Toughness)" /></div>

  <div class="mt-1 flex items-center justify-between border-b border-ink/30">
    <span class="subhead border-0">Resources</span>
    <button
      type="button"
      class="text-xs underline opacity-70 hover:opacity-100 print:hidden"
      title="Refill every pool to its maximum"
      onclick={() => c.resources.forEach((r) => (r.current = app.d.resources[r.id] ?? r.max))}>Refill all</button
    >
  </div>
  <DynamicTable bind:items={c.resources} cols={3} onadd={() => c.resources.push(make.resource())} addLabel="Pool" empty="Grit, Panache, Arcane Pool, Ki, Burn…">
    {#snippet head()}
      <th>Pool</th>
      <th class="text-center">Current</th>
      <th class="text-center">Max</th>
    {/snippet}
    {#snippet row(r)}
      <td class="min-w-20"><input class="w-full font-semibold" bind:value={r.name} aria-label="Pool name" title={r.notes} /></td>
      <td class="w-24">
        <div class="flex items-center">
          <button type="button" class="icon-btn print:hidden" aria-label="Spend one" onclick={() => (r.current = Math.max(0, r.current - 1))}>−</button>
          <NumInput class="font-bold print:invisible" bind:value={r.current} aria-label="{r.name} current" />
          <button type="button" class="icon-btn print:hidden" aria-label="Gain one" onclick={() => r.current++}>+</button>
        </div>
      </td>
      <td class="w-14"><FormulaInput bind:value={r.max} bind:expr={r.maxExpr} result={app.d.resources[r.id] ?? r.max} label="{r.name} max" /></td>
    {/snippet}
  </DynamicTable>
</Section>
