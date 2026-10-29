<script lang="ts">
  import { rolls } from './rolls.svelte';
</script>

<!-- Floating roll log button, bottom right on every tab. -->
<button
  type="button"
  class="fixed right-4 bottom-4 z-40 flex size-12 items-center justify-center rounded-full bg-accent text-paper shadow-lg transition-transform hover:scale-105 print:hidden"
  title="Roll log and dice"
  aria-label="Roll log{rolls.unread ? ` (${rolls.unread} new)` : ''}"
  onclick={() => rolls.toggle()}
>
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" class="size-6" aria-hidden="true">
    <path d="M10 1.8 17.2 6v8L10 18.2 2.8 14V6L10 1.8Z" />
    <path d="M10 1.8 6 8.5h8L10 1.8ZM2.8 6 6 8.5 4.2 13.3 2.8 14M17.2 6 14 8.5l1.8 4.8 1.4.7M6 8.5l1.6 5.3h4.8L14 8.5M7.6 13.8 10 18.2l2.4-4.4" />
  </svg>
  {#if rolls.unread}<span class="roll-badge">{rolls.unread}</span>{/if}
</button>
