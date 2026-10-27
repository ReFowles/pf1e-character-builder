<script lang="ts">
  import { CONDITIONS } from '../../lib/rules/conditions';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import Chips from '../../lib/ui/Chips.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';
  import { breakdown } from '../../lib/ui/format';

  const c = $derived(app.char);
  const hp = $derived(app.d.hp);
  let amount = $state(0);
  const CONDITION_NAMES = Object.values(CONDITIONS).map((d) => d.name);

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

<Section id="hp" editable>
  {#snippet info()}
    <BreakdownList items={[{ label: 'Max HP', total: hp.max, signed: false }]} />
    <p>Damage uses up temporary hit points first. Healing also removes the same amount of nonlethal damage.</p>
    <p>
      At 0 HP you're <strong>disabled</strong>; below 0, <strong>dying</strong>; at −Con score ({-app.d.abilities.con.tempScore}), <strong>dead</strong>.
      Nonlethal equal to current HP leaves you <strong>staggered</strong>; more, <strong>unconscious</strong>.
    </p>
    {#each app.d.conditionNotes as note (note)}<p class="text-xs">{note}</p>{/each}
  {/snippet}

  <div class="flex items-center justify-between gap-2">
    <label class="flex items-center gap-1.5">
      <span class="field-label text-[0.65rem]">Temp</span>
      <NumInput class="w-12 print:invisible" bind:value={c.hp.temp} aria-label="Temporary hit points" />
    </label>
    <label class="flex items-center gap-1.5">
      <span class="field-label text-[0.65rem]">Nonlethal</span>
      <NumInput class="w-12 print:invisible" bind:value={c.hp.nonlethal} aria-label="Nonlethal damage" />
    </label>
  </div>

  <!-- Max HP in a small box on the left; current HP (tracked in play) fills the rest. -->
  <div class="grid grid-cols-[auto_1fr] items-center gap-2 rounded-sm border border-ink p-1.5">
    <div class="flex min-w-16 flex-col items-center rounded-sm border border-ink/40 px-2 py-1" title={breakdown(hp.max)}>
      <span class="text-2xl leading-tight font-bold tabular-nums" data-hp-max>{hp.max.total}</span>
      <span class="field-label">Max HP</span>
    </div>
    <div class="flex flex-col items-center">
      <input
        class="h-11 w-full border-0 bg-transparent text-center text-4xl leading-none font-bold tabular-nums print:invisible"
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
      <span class="field-label">Current HP{status ? ` — ${status}` : ''}</span>
    </div>
  </div>

  <div class="flex items-center gap-1 print:hidden">
    <NumInput class="w-14" bind:value={amount} aria-label="Damage or healing amount" />
    <button type="button" class="btn" onclick={damage}>Damage</button>
    <button type="button" class="btn" onclick={heal}>Heal</button>
    <button type="button" class="btn ml-auto" onclick={() => ((c.hp.damage = 0), (c.hp.nonlethal = 0))}>Full heal</button>
  </div>

  <div class="flex flex-col">
    <span class="field-label">Conditions</span>
    <Chips always bind:items={c.conditions} suggestions={CONDITION_NAMES} placeholder="Add condition…" label="Add condition" />
    {#each app.d.conditionNotes as note (note)}
      <p class="text-xs opacity-70">{note}</p>
    {/each}
  </div>
  <div class="print:hidden"><BonusList keys={['hp.max']} label="Extra max HP (e.g. Toughness)" /></div>
</Section>
