<script lang="ts">
  interface Props {
    max: number;
    used: number;
    label?: string;
  }
  let { max, used = $bindable(), label = 'use' }: Props = $props();
  // Checkboxes for small pools; a counter for large ones.
  const boxes = $derived(max > 0 && max <= 20);
</script>

{#if boxes}
  <div class="flex flex-wrap items-center gap-0.5 self-center" role="group" aria-label="{label} tracker">
    {#each { length: max }, i (i)}
      <input
        type="checkbox"
        aria-label="{label} {i + 1}"
        checked={i < used}
        onchange={() => (used = i < used ? i : i + 1)}
      />
    {/each}
  </div>
{:else}
  <div class="flex items-center gap-1 text-sm">
    <button type="button" class="icon-btn print:hidden" aria-label="Use one" onclick={() => (used = Math.min(max, used + 1))}>−</button>
    <span class="tabular-nums">{Math.max(0, max - used)} / {max} left</span>
    <button type="button" class="icon-btn print:hidden" aria-label="Restore one" onclick={() => (used = Math.max(0, used - 1))}>+</button>
  </div>
{/if}
