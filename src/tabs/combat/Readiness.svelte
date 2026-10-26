<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import Stat from '../../lib/ui/Stat.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import FormulaInput from '../../lib/ui/FormulaInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';

  const c = $derived(app.char);
  const d = $derived(app.d);
  const SPEED_MODES = ['fly', 'swim', 'climb', 'burrow'];
  const MANEUVERABILITY = ['clumsy', 'poor', 'average', 'good', 'perfect'];
</script>

{#snippet speeds(editing: boolean)}
  {#each c.speeds.other as s, i (s.id)}
    <div class="stat">
      {#if editing}
        <div class="flex items-center gap-0.5">
          <NumInput class="w-12" bind:value={s.value} aria-label="{s.mode} speed" />
          <button type="button" class="icon-btn text-accent" aria-label="Remove {s.mode} speed" onclick={() => c.speeds.other.splice(i, 1)}>✕</button>
        </div>
        <Select class="w-full text-xs" bind:value={s.mode} options={opts(SPEED_MODES)} aria-label="Movement mode" />
        {#if s.mode === 'fly'}
          <Select class="w-full text-xs" bind:value={s.maneuverability} options={[{ value: '' as const, label: '—' }, ...opts(MANEUVERABILITY)]} aria-label="Fly maneuverability" />
        {/if}
      {:else}
        <div class="stat-value text-3xl">{s.value}<span class="text-xs">ft</span></div>
        <div class="field-label">{s.mode}{s.maneuverability ? ` (${s.maneuverability})` : ''}</div>
      {/if}
    </div>
  {/each}
  {#if editing}
    <button type="button" class="add-btn self-center print:hidden" onclick={() => c.speeds.other.push(make.otherSpeed('fly'))}>+ Speed</button>
  {/if}
{/snippet}

{#snippet editFields(editing: boolean)}
  {#if editing}
    <div class="flex gap-2 print:hidden">
      <Field label="Base speed" class="w-24"><NumInput bind:value={c.speeds.base} /></Field>
      <Field label="Armored (0 = calc)" class="w-32"><NumInput bind:value={c.speeds.armored} /></Field>
    </div>
  {/if}
{/snippet}

<Section id="readiness" editable>
  {#snippet info()}
    <BreakdownList items={[{ label: 'Initiative', total: d.init }]} />
    <p>
      <strong>Speed</strong> is your base speed plus speed bonuses.
      {#if d.speed.encumbered}It's reduced (*) by medium or heavy armor or load; set an armored speed in Edit to override.{/if}
    </p>
    <p><strong>Resources</strong> can use a formula for their maximum, e.g. <code>max(1, @wis.mod)</code>.</p>
  {/snippet}
  <div class="flex flex-wrap items-stretch gap-1.5">
    <Stat label="Initiative" value={d.init} big />
    <div class="stat" title={d.speed.encumbered ? 'Reduced by armor or load' : undefined}>
      <div class="stat-value text-3xl">{d.speed.base}<span class="text-xs">ft</span></div>
      <div class="field-label">Speed{d.speed.encumbered ? '*' : ''}</div>
    </div>
    <EditMode>{#snippet children(editing)}{@render speeds(editing)}{/snippet}</EditMode>
    <div class="stat ml-auto">
      <NumInput class="stat-value w-14" bind:value={c.heroPoints} aria-label="Hero points" />
      <div class="field-label">Hero pts</div>
    </div>
  </div>
  <EditMode>{#snippet children(editing)}{@render editFields(editing)}{/snippet}</EditMode>
  <div class="print:hidden"><BonusList keys={['init', 'speed']} label="Initiative / speed bonuses" /></div>

  <div class="mt-1 flex items-center justify-between border-b border-ink/30">
    <span class="subhead border-0">Resources</span>
    <button
      type="button"
      class="text-xs underline opacity-70 hover:opacity-100 print:hidden"
      title="Refill every pool to its maximum"
      onclick={() => c.resources.forEach((r) => (r.current = d.resources[r.id] ?? r.max))}>Refill all</button
    >
  </div>
  <DynamicTable bind:items={c.resources} cols={3} onadd={() => c.resources.push(make.resource())} addLabel="Pool" empty="Grit, Panache, Arcane Pool, Ki, Burn…">
    {#snippet head()}
      <th>Pool</th>
      <th class="text-center">Current</th>
      <th class="text-center">Max</th>
    {/snippet}
    {#snippet row(r)}
      <td data-label="Pool" class="min-w-20 align-middle"><input class="w-full font-semibold" bind:value={r.name} aria-label="Pool name" title={r.notes} /></td>
      <td data-label="Current" class="w-24 align-middle">
        <div class="flex items-center">
          <button type="button" class="icon-btn print:hidden" aria-label="Spend one" onclick={() => (r.current = Math.max(0, r.current - 1))}>−</button>
          <NumInput class="font-bold print:invisible" bind:value={r.current} aria-label="{r.name} current" />
          <button type="button" class="icon-btn print:hidden" aria-label="Gain one" onclick={() => r.current++}>+</button>
        </div>
      </td>
      <td data-label="Max" class="w-14 align-middle"><FormulaInput bind:value={r.max} bind:expr={r.maxExpr} result={d.resources[r.id] ?? r.max} label="{r.name} max" /></td>
    {/snippet}
  </DynamicTable>
</Section>
