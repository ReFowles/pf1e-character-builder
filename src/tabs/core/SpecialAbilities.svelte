<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import type { UsePeriod } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import FormulaInput from '../../lib/ui/FormulaInput.svelte';
  import UsesTracker from '../../lib/ui/UsesTracker.svelte';
  import DynamicList from '../../lib/ui/DynamicList.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';

  const c = $derived(app.char);
  const PERIODS: UsePeriod[] = ['round', 'minute', 'hour', 'day', 'week', 'month', 'year', 'other'];

  function reset(per: UsePeriod) {
    for (const a of c.specialAbilities) for (const u of a.uses) if (u.per === per) u.used = 0;
    app.notify(`Reset all per-${per} uses.`);
  }
</script>

<Section id="special" editable>
  {#snippet info()}
    <p>Track limited-use abilities from classes, feats, racial traits and items. Each can have several counters (e.g. 3/day and 5 rounds).</p>
    <p>Maximums can be formulas, e.g. <code>3 + @cha.mod</code>. "Reset rounds" and "New day" clear per-round and per-day counters.</p>
  {/snippet}
  {#snippet actions()}
    <button type="button" class="head-btn" onclick={() => reset('round')}>Reset rounds</button>
    <button type="button" class="head-btn" onclick={() => reset('day')}>New day</button>
  {/snippet}
  <EditMode>{#snippet children(editing)}
  <DynamicList
    bind:items={c.specialAbilities}
    onadd={() => c.specialAbilities.push(make.specialAbility())}
    addLabel="Special ability"
    empty="Rage, Channel Energy, Bombs, Wild Shape…"
    class="grid grid-cols-1 gap-2 @2xl:grid-cols-2 @5xl:grid-cols-3"
  >
    {#snippet item(a)}
      <div class="grid grid-cols-[2fr_1fr] gap-2">
        <Field label="Ability"><input class="font-semibold" bind:value={a.name} /></Field>
        <Field label="Source"><input bind:value={a.source} placeholder="Class, feat, item…" /></Field>
      </div>
      <div class="mt-1 flex flex-col gap-1">
        {#each a.uses as u, i (u.id)}
          <div class="flex flex-wrap items-center gap-1 text-sm">
            <FormulaInput class="w-12" bind:value={u.max} bind:expr={u.maxExpr} result={app.d.uses[u.id] ?? u.max} label="Max uses" />
            <span>/</span>
            <Select bind:value={u.per} options={opts(PERIODS, (p) => p)} aria-label="Per" />
            <UsesTracker max={app.d.uses[u.id] ?? u.max} bind:used={u.used} label="{a.name} use" />
            {#if editing}<button type="button" class="icon-btn ml-auto text-accent print:hidden" aria-label="Remove uses" onclick={() => a.uses.splice(i, 1)}>✕</button>{/if}
          </div>
        {/each}
        {#if editing}<button type="button" class="self-start text-xs underline opacity-70 print:hidden" onclick={() => a.uses.push(make.useCounter())}>+ uses</button>{/if}
      </div>
      <textarea class="mt-1 w-full text-sm" rows="1" bind:value={a.notes} placeholder="Notes" aria-label="Notes"></textarea>
    {/snippet}
    {#snippet blank()}<div class="h-14"></div>{/snippet}
  </DynamicList>
  {/snippet}</EditMode>
</Section>
