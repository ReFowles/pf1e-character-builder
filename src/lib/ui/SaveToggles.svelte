<script lang="ts">
  import { toggle } from '../arrays';
  import { SAVES, type Save } from '../model/types';

  // Three small F/R/W buttons that mark a class's or creature's good saves.
  let { saves = $bindable() }: { saves: Save[] } = $props();
</script>

{#each SAVES as s (s)}
  <button
    type="button"
    class={['mx-px rounded-sm border px-1 text-xs uppercase', { 'bg-ink text-paper': saves.includes(s) }]}
    aria-pressed={saves.includes(s)}
    aria-label="Good {s} save"
    onclick={() => (saves = toggle(saves, s))}>{s[0]}</button
  >
{/each}
