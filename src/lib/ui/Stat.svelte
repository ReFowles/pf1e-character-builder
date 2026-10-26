<script lang="ts">
  import type { Total } from '../rules/bonuses';
  import { breakdown, fmt } from './format';

  interface Props {
    label: string;
    value: number | Total;
    signed?: boolean;
    big?: boolean;
    class?: string;
  }
  let { label, value, signed = true, big = false, class: cls = '' }: Props = $props();
  const n = $derived(typeof value === 'number' ? value : value.total);
  const tip = $derived(typeof value === 'number' ? undefined : breakdown(value));
</script>

<div class="stat {cls}" title={tip}>
  <div class="stat-value" class:text-3xl={big}>{signed ? fmt(n) : n}</div>
  <div class="field-label">{label}</div>
</div>
