<script lang="ts">
  import type { Total } from '../rules/bonuses';
  import { breakdown, fmt } from './format';

  interface Props {
    label: string;
    value: number | Total;
    signed?: boolean;
    big?: boolean;
    /** Text to show instead of the number (e.g. iterative attacks). */
    display?: string;
    class?: string;
  }
  let { label, value, signed = true, big = false, display, class: cls = '' }: Props = $props();
  const n = $derived(typeof value === 'number' ? value : value.total);
  const tip = $derived(typeof value === 'number' ? undefined : breakdown(value));
</script>

<div class="stat {cls}" title={tip}>
  <div class="stat-value whitespace-nowrap" class:text-3xl={big && !display} class:text-2xl={big && !!display}>{display ?? (signed ? fmt(n) : n)}</div>
  <div class="field-label">{label}</div>
</div>
