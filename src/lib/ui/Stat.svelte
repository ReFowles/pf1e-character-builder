<script lang="ts">
  import type { Total } from '../rules/bonuses';
  import { breakdown, fmt } from './format';

  interface Props {
    label: string;
    value: number | Total;
    signed?: boolean;
    /** Value size: sm = text-xl, md = text-2xl, lg = text-3xl. */
    size?: 'sm' | 'md' | 'lg';
    /** Text to show instead of the number (e.g. iterative attacks). */
    display?: string;
    class?: string;
  }
  let { label, value, signed = true, size = 'sm', display, class: cls = '' }: Props = $props();
  const SIZES = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' };
  const n = $derived(typeof value === 'number' ? value : value.total);
  const tip = $derived(typeof value === 'number' ? undefined : breakdown(value));
</script>

<div class="stat {cls}" title={tip}>
  <div class="stat-value whitespace-nowrap {SIZES[size]}">{display ?? (signed ? fmt(n) : n)}</div>
  <div class="field-label">{label}</div>
</div>
