<script lang="ts">
  import type { Total } from '../rules/bonuses';
  import { partsOf } from '../dice/roll';
  import { rollable } from '../dice/rollable';
  import { breakdown, fmt } from './format';
  import Iterative from './Iterative.svelte';

  interface Props {
    label: string;
    value: number | Total;
    signed?: boolean;
    /** Value size: sm = text-xl, md = text-2xl, lg = text-3xl. */
    size?: 'sm' | 'md' | 'lg';
    /** Text to show instead of the number (e.g. iterative attacks). */
    display?: string;
    class?: string;
    /** Click to roll d20 + value; a title overrides the label in the roll log. */
    roll?: boolean | { title?: string; subtitle?: string };
  }
  let { label, value, signed = true, size = 'sm', display, class: cls = '', roll = false }: Props = $props();
  const SIZES = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' };
  const n = $derived(typeof value === 'number' ? value : value.total);
  const tip = $derived(typeof value === 'number' ? undefined : breakdown(value));
  const iterative = $derived(!!display?.includes('/'));
  const rollTitle = $derived((typeof roll === 'object' && roll.title) || label);
  const rollSubtitle = $derived(typeof roll === 'object' ? roll.subtitle : undefined);
  const parts = $derived(typeof value === 'number' ? [] : partsOf(value));
</script>

<div class="stat {cls}" title={tip}>
  <div
    class="stat-value text-center {SIZES[size]}"
    class:whitespace-nowrap={!iterative}
    use:rollable={{ title: rollTitle, subtitle: rollSubtitle, bonus: n, parts, disabled: !roll || iterative }}
  >
    {#if iterative}
      <Iterative text={display!} onroll={roll ? { title: rollTitle, subtitle: rollSubtitle, bonus: n, parts } : undefined} />
    {:else}{display ?? (signed ? fmt(n) : n)}{/if}
  </div>
  <div class="field-label">{label}</div>
</div>
