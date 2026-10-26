<script lang="ts">
  import type { Total } from '../rules/bonuses';
  import { fmt } from './format';

  interface Props {
    items: { label: string; total: Total; signed?: boolean }[];
  }
  let { items }: Props = $props();
</script>

<dl class="flex flex-col gap-1.5">
  {#each items as it, i (i)}
    <div>
      <dt class="flex justify-between font-semibold">
        <span>{it.label}</span><span class="tabular-nums">{it.signed === false ? it.total.total : fmt(it.total.total)}</span>
      </dt>
      <dd class="pl-2 text-xs opacity-75">
        {#each it.total.parts as p, i (i)}
          <span class="mr-2 whitespace-nowrap" class:line-through={!p.applied}>{fmt(p.value)} {p.source}{p.type !== 'untyped' ? ` (${p.type})` : ''}</span>
        {/each}
      </dd>
    </div>
  {/each}
</dl>
