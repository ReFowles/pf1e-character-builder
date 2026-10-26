<script lang="ts">
  import { ABILITIES } from '../../lib/model/types';
  import { ABILITY_INCREASE_TIERS, BASE_MYTHIC_ABILITIES } from '../../lib/rules/mythic';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';

  const m = $derived(app.char.mythic);
</script>

<Section id="mythicAbilities">
  {#snippet info()}
    <p>Base abilities unlock at your effective tier ({app.d.mythic?.effectiveTier ?? 0}). Every second tier grants +2 to one ability score (actual tier).</p>
  {/snippet}
  <ul class="flex flex-col text-sm">
    {#each BASE_MYTHIC_ABILITIES as a (a.name)}
      <li class="border-b border-ink/10 py-0.5" class:opacity-40={a.tier > (app.d.mythic?.effectiveTier ?? m.tier)}>
        <span class="mr-1 inline-block w-6 text-xs tabular-nums opacity-60">T{a.tier}</span>
        <span class="font-semibold">{a.name}</span>
        <span class="text-xs opacity-80">— {a.summary}</span>
      </li>
    {/each}
  </ul>
  <div class="flex flex-col gap-1">
    <span class="field-label">Ability score increases (+2)</span>
    <div class="grid grid-cols-5 gap-1">
      {#each ABILITY_INCREASE_TIERS as t, i (t)}
        <label class="field" class:opacity-40={t > m.tier}>
          <select bind:value={m.abilityIncreases[i]} aria-label="Ability increase at tier {t}">
            <option value={null}>—</option>
            {#each ABILITIES as a (a)}<option value={a}>{a.toUpperCase()}</option>{/each}
          </select>
          <span class="field-label">Tier {t}</span>
        </label>
      {/each}
    </div>
  </div>
</Section>
