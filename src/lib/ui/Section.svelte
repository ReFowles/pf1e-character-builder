<script lang="ts">
  import type { Snippet } from 'svelte';
  import { app } from '../state.svelte';
  import { SECTION_BY_ID } from '../sections';
  import Chevron from './Chevron.svelte';
  import { setSectionContext } from './sectionContext';

  interface Props {
    id: string;
    title?: string;
    /** Extra header controls, hidden in print. */
    actions?: Snippet;
    /** Content for the ℹ popover: breakdowns and rules that are otherwise hover-only. */
    info?: Snippet;
    /** Show an Edit/Done toggle; add, move, delete and find controls appear only while editing. */
    editable?: boolean;
    children: Snippet;
    class?: string;
    bodyClass?: string;
    style?: string;
  }
  let {
    id,
    title = SECTION_BY_ID[id]?.title ?? id,
    actions,
    info,
    editable = false,
    children,
    class: cls = '',
    bodyClass = '',
    style = '',
  }: Props = $props();
  const ui = $derived(app.section(id));

  let editing = $state(false);
  setSectionContext({
    get editing() {
      return editable && editing;
    },
  });
  const popoverId = $derived(`info-${id}`);
</script>

{#if !ui.hidden || !ui.printHidden}
  <section
    data-section={id}
    style:--area={id}
    {style}
    class={['sheet-section', cls, { 'screen-hidden': ui.hidden, 'print:hidden': ui.printHidden, collapsed: ui.collapsed, editing }]}
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
      <div class="flex items-center gap-1 print:hidden">
        {#if actions}{@render actions()}{/if}
        {#if editable && !ui.collapsed}
          <button type="button" class="head-btn" aria-pressed={editing} onclick={() => (editing = !editing)}>{editing ? 'Done' : 'Edit'}</button>
        {/if}
        {#if info}
          <button type="button" class="head-btn size-6 rounded-full p-0 font-serif italic" popovertarget={popoverId} aria-label="About {title}" title="Details">i</button>
        {/if}
      </div>
    </header>
    <div class={['section-body', bodyClass, { 'screen-collapsed': ui.collapsed }]}>
      {@render children()}
    </div>
    {#if info}
      <div id={popoverId} popover class="info-popover">
        <div class="mb-2 flex items-center justify-between gap-4">
          <h3 class="font-display text-sm font-bold tracking-widest uppercase">{title}</h3>
          <button type="button" class="icon-btn" popovertarget={popoverId} popovertargetaction="hide" aria-label="Close">✕</button>
        </div>
        <div class="flex flex-col gap-2 text-sm">{@render info()}</div>
      </div>
    {/if}
  </section>
{/if}
