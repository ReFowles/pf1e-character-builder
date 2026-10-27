<script lang="ts">
  interface Props {
    max: number;
    used: number;
    label?: string;
    /** Wrap the checkboxes after this many per row. */
    perRow?: number;
  }
  let { max, used = $bindable(), label = 'use', perRow }: Props = $props();
  // Checkboxes for small pools; a counter for large ones.
  const boxes = $derived(max > 0 && max <= 20);
</script>

{#if boxes}
  <!-- 1rem boxes + 0.125rem gaps: a fixed width makes a row hold exactly `perRow` boxes, even in a shrink-to-fit table cell. -->
  <div
    class="flex flex-wrap items-center gap-0.5 self-center"
    style:width={perRow ? `calc(${Math.min(max, perRow)} * 1rem + ${Math.min(max, perRow) - 1} * 0.125rem)` : undefined}
    role="group"
    aria-label="{label} tracker"
  >
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
