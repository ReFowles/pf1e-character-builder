<script lang="ts">
  import type { Snippet } from 'svelte';
  import { app } from '../state.svelte';
  import { SECTION_BY_ID } from '../sections';
  import Chevron from './Chevron.svelte';

  interface Props {
    id: string;
    title?: string;
    /** Extra header controls (add buttons etc.), hidden in print. */
    actions?: Snippet;
    children: Snippet;
    class?: string;
    bodyClass?: string;
  }
  let { id, title = SECTION_BY_ID[id]?.title ?? id, actions, children, class: cls = '', bodyClass = '' }: Props = $props();
  const ui = $derived(app.section(id));
</script>

{#if !ui.hidden || !ui.printHidden}
  <section
    data-section={id}
    style:--area={id}
    class={['sheet-section', cls, { 'screen-hidden': ui.hidden, 'print:hidden': ui.printHidden, collapsed: ui.collapsed }]}
  >
    <header class="section-head" class:rounded-sm={ui.collapsed}>
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        aria-expanded={!ui.collapsed}
        onclick={() => app.setSection(id, { collapsed: !ui.collapsed })}
      >
        <Chevron open={!ui.collapsed} class="size-5 print:hidden" />
        <h2 class="truncate">{title}</h2>
      </button>
      {#if actions}<div class="flex items-center gap-1 print:hidden">{@render actions()}</div>{/if}
    </header>
    <div class={['section-body', bodyClass, { 'screen-collapsed': ui.collapsed }]}>
      {@render children()}
    </div>
  </section>
{/if}
