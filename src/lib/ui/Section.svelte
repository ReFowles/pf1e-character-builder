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
    /** Header controls shown only while editing (e.g. remove the section). */
    editActions?: Snippet;
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
    editActions,
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
    get editable() {
      return editable;
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
    <header class="section-head">
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
        {#if editActions && editable && editing && !ui.collapsed}{@render editActions()}{/if}
        {#if editable && !ui.collapsed}
          <button
            type="button"
            class="head-btn size-6 p-0"
            aria-pressed={editing}
            aria-label={editing ? `Done editing ${title}` : `Edit ${title}`}
            title={editing ? 'Done editing' : 'Edit'}
            data-tour="edit"
            onclick={() => (editing = !editing)}
          >
            {#if editing}
              <svg viewBox="0 0 20 20" fill="currentColor" class="size-4" aria-hidden="true"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clip-rule="evenodd" /></svg>
            {:else}
              <svg viewBox="0 0 20 20" fill="currentColor" class="size-3.5" aria-hidden="true"><path d="M13.6 2.6a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-9.2 9.2a1 1 0 0 1-.47.26l-4 1a1 1 0 0 1-1.21-1.21l1-4a1 1 0 0 1 .26-.47l9.82-9.58ZM12 6.4l-7 7-.5 2.1 2.1-.5 7-7L12 6.4Z" /></svg>
            {/if}
          </button>
        {/if}
        {#if info}
          <button type="button" class="head-btn size-6 rounded-full p-0 font-serif italic" popovertarget={popoverId} aria-label="About {title}" title="Details" data-tour="info">i</button>
        {/if}
      </div>
    </header>
    <div class={['section-body @container', bodyClass, { 'screen-collapsed': ui.collapsed }]}>
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
