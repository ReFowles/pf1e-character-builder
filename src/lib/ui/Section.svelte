<script lang="ts">
  import type { Snippet } from 'svelte';
  import { app } from '../state.svelte';
  import { SECTION_BY_ID } from '../sections';

  interface Props {
    id: string;
    title?: string;
    /** Extra header controls (add buttons etc.), hidden in print. */
    actions?: Snippet;
    children: Snippet;
    class?: string;
  }
  let { id, title = SECTION_BY_ID[id]?.title ?? id, actions, children, class: cls = '' }: Props = $props();
  const ui = $derived(app.section(id));
</script>

{#if !ui.hidden || !ui.printHidden}
  <section
    data-section={id}
    style:--area={id}
    class={['sheet-section', cls, { 'screen-hidden': ui.hidden, 'print:hidden': ui.printHidden }]}
  >
    <header class="section-head">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-1 text-left"
        aria-expanded={!ui.collapsed}
        onclick={() => app.setSection(id, { collapsed: !ui.collapsed })}
      >
        <span class="text-xs transition-transform print:hidden" class:-rotate-90={ui.collapsed}>▾</span>
        <h2 class="truncate">{title}</h2>
      </button>
      {#if actions}<div class="flex items-center gap-1 print:hidden">{@render actions()}</div>{/if}
      <button
        type="button"
        class="icon-btn print:hidden"
        title="Hide section (restore from Config)"
        aria-label="Hide {title}"
        onclick={() => app.setSection(id, { hidden: true })}>✕</button
      >
    </header>
    <div class="section-body" class:screen-collapsed={ui.collapsed}>
      {@render children()}
    </div>
  </section>
{/if}
