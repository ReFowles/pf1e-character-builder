<script lang="ts">
  import { CONDITIONS } from '../../lib/rules/conditions';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import Stat from '../../lib/ui/Stat.svelte';
  import Chips from '../../lib/ui/Chips.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';

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

<Section id="hp">
  <div class="grid grid-cols-3 gap-1">
    <Stat label="Max HP" value={hp.max} signed={false} />
    <div class="stat">
      <NumInput class="stat-value border-0" bind:value={c.hp.temp} aria-label="Temporary hit points" />
      <div class="field-label">Temp</div>
    </div>
    <div class="stat">
      <NumInput class="stat-value border-0" bind:value={c.hp.nonlethal} aria-label="Nonlethal damage" />
      <div class="field-label">Nonlethal</div>
    </div>
  </div>
  <div class="flex flex-col items-center justify-center rounded-sm border-2 border-ink p-1">
      <input
        class="w-full border-0 text-center text-5xl font-bold tabular-nums print:invisible"
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
    <div class="field-label">Current{status ? ` — ${status}` : ''}</div>
  </div>

  <div class="flex items-center gap-1 print:hidden">
    <NumInput class="w-14" bind:value={amount} aria-label="Damage or healing amount" />
    <button type="button" class="btn" onclick={damage}>Damage</button>
    <button type="button" class="btn" onclick={heal}>Heal</button>
    <button type="button" class="ml-auto text-xs underline opacity-70" onclick={() => ((c.hp.damage = 0), (c.hp.nonlethal = 0))}>Full heal</button>
  </div>

  <div class="flex flex-col">
    <span class="field-label">Conditions</span>
    <Chips bind:items={c.conditions} suggestions={CONDITION_NAMES} placeholder="Add condition…" label="Add condition" />
    {#each app.d.conditionNotes as note (note)}
      <p class="text-xs opacity-70">{note}</p>
    {/each}
  </div>
  <div class="print:hidden"><BonusList keys={['hp.max']} label="Extra max HP (e.g. Toughness)" /></div>
</Section>
