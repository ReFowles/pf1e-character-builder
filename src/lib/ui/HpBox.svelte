<script lang="ts">
  import type { Total } from '../rules/bonuses';
  import { breakdown } from './format';

  // Max HP in a small box on the left; current HP (tracked in play) fills the rest.
  interface Props {
    max: Total;
    current: number;
    /** Typing a current value writes the difference here as damage. */
    hp: { damage: number; temp: number };
    /** Prefix for the input's label ("Hati current hit points"). */
    owner?: string;
    /** Shown after "Current HP" (Dying, Disabled…). */
    status?: string;
    /** Smaller numbers (companions). */
    compact?: boolean;
  }
  let { max, current, hp, owner = '', status = '', compact = false }: Props = $props();
</script>

<div class="grid grid-cols-[auto_1fr] items-center gap-2 rounded-sm border border-ink p-1.5">
  <div class={['flex flex-col items-center rounded-sm border border-ink/40 px-2', compact ? 'min-w-14 py-0.5' : 'min-w-16 py-1']} title={breakdown(max)}>
    <span class={['leading-tight font-bold tabular-nums', compact ? 'text-xl' : 'text-2xl']} data-hp-max>{max.total}</span>
    <span class="field-label">Max HP</span>
  </div>
  <div class="flex flex-col items-center">
    <input
      class={['w-full border-0 bg-transparent text-center leading-none font-bold tabular-nums print:invisible', compact ? 'h-9 text-3xl' : 'h-11 text-4xl', { 'text-accent': current <= max.total / 4 }]}
      inputmode="numeric"
      aria-label="{owner ? `${owner} ` : ''}current hit points"
      value={current}
      onchange={(e) => {
        const v = Number(e.currentTarget.value);
        if (Number.isFinite(v)) hp.damage = max.total + hp.temp - v;
        e.currentTarget.value = String(max.total + hp.temp - hp.damage);
      }}
    />
    <span class="field-label">Current HP{status ? ` — ${status}` : ''}</span>
  </div>
</div>
