<script lang="ts">
  import { ABILITIES, type Ability } from '../model/types';
  import type { Total } from '../rules/bonuses';
  import { rollable } from '../dice/rollable';
  import NumInput from './NumInput.svelte';
  import { breakdown, fmt } from './format';

  // Six ability rows: score, modifier, temp-adjusted score and modifier, and the ± input.
  interface AbilityRow {
    score: number;
    mod: number;
    tempScore: number;
    tempMod: number;
    hasTemp: boolean;
    breakdown: Total;
  }
  interface Props {
    abilities: Record<Ability, AbilityRow>;
    /** Where the ± column writes its temporary change. */
    scores: Record<Ability, { temp: number }>;
    /** Prefix for the ± inputs' labels ("Hati str temporary change"). */
    owner?: string;
    /** Tighter rows (companions, beside the portrait). */
    compact?: boolean;
    /** Click a modifier to roll an ability check, with this subtitle in the log. */
    roll?: boolean | { subtitle?: string };
  }
  let { abilities, scores, owner = '', compact = false, roll = false }: Props = $props();
  const size = $derived(
    compact
      ? { th: 'w-11 py-0.5 text-xs', value: 'text-lg', box: 'h-6 leading-6', cell: 'h-6', col: '' }
      : { th: 'w-12 py-1 text-sm', value: 'text-xl', box: 'h-7 leading-7', cell: 'h-7', col: 'w-14' },
  );
</script>

<table class={['ability-table w-full text-center', compact && 'compact min-w-0 flex-1 text-sm']}>
  <thead>
    <tr class={compact ? 'h-5' : ''}>
      <th></th>
      <th class="text-center">Score</th>
      <th class="text-center">Mod</th>
      <th class="text-center {size.col}">Temp</th>
      <th class="text-center {size.col}">Temp mod</th>
      <th class="text-center {size.col}" title="Temporary change to the score (damage, drain, enhancement…)">±</th>
    </tr>
  </thead>
  <tbody>
    {#each ABILITIES as a (a)}
      {@const s = abilities[a]}
      {@const mod = s.hasTemp ? s.tempMod : s.mod}
      <tr title={breakdown(s.breakdown)}>
        <th class="bg-head text-center text-head-ink opacity-100 {size.th}" style="print-color-adjust: exact">{a.toUpperCase()}</th>
        <td class="font-bold tabular-nums {size.value}">{s.score}</td>
        <td class="font-bold tabular-nums {size.value}">
          <span use:rollable={{ title: `${a.toUpperCase()} check`, subtitle: typeof roll === 'object' ? roll.subtitle : undefined, bonus: mod, parts: [{ source: `${a.toUpperCase()} modifier`, value: mod }], disabled: !roll }}>{fmt(s.mod)}</span>
        </td>
        <td class="px-1"><div class="write-box tabular-nums {size.box}">{s.hasTemp ? s.tempScore : ''}</div></td>
        <td class="px-1"><div class="write-box tabular-nums {size.box}">{s.hasTemp ? fmt(s.tempMod) : ''}</div></td>
        <td class="px-1">
          <div class="print:rounded-sm print:border print:border-ink/30 {size.cell}">
            <NumInput class="h-full w-full bg-field print:invisible" bind:value={scores[a].temp} signed aria-label="{owner ? `${owner} ` : ''}{a} temporary change" />
          </div>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
