<script lang="ts">
  import type { Snippet } from 'svelte';
  import { uid } from '../model/id';

  interface Props {
    open: boolean;
    title: string;
    /** Under the title, e.g. a class's summary. */
    subtitle?: string;
    /** Tailwind max-width class. */
    width?: string;
    /** A side panel that leaves the sheet usable behind it, instead of a centred modal. */
    flyout?: boolean;
    children: Snippet;
    /** Pinned below the scrolling body. */
    footer?: Snippet;
  }
  let { open = $bindable(), title, subtitle, width = 'max-w-2xl', flyout = false, children, footer }: Props = $props();

  let dialog: HTMLDialogElement;
  const titleId = `modal-${uid()}`;

  $effect(() => {
    if (open && !dialog.open) flyout ? dialog.show() : dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
</script>

<!-- The flyout sits over the dice button (z-40) and under the roll log drawer (z-50). -->
<!-- A click on the backdrop lands on the dialog element itself; Escape is handled by the dialog (modal only). -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  class={[
    'w-full flex-col bg-paper p-0 text-ink shadow-xl open:flex print:hidden',
    flyout
      ? 'fixed inset-y-0 right-0 left-auto z-45 m-0 h-dvh max-h-none border-l border-ink/30'
      : 'm-auto max-h-[90vh] rounded-sm backdrop:bg-scrim',
    width,
  ]}
  aria-labelledby={titleId}
  onclose={() => (open = false)}
  onclick={(e) => e.target === dialog && dialog.close()}
  onkeydown={(e) => flyout && e.key === 'Escape' && dialog.close()}
>
  {#if open}
    <header class="flex items-start justify-between gap-2 border-b border-ink/20 px-4 py-3">
      <div>
        <h2 id={titleId} class="font-display text-lg font-bold">{title}</h2>
        {#if subtitle}<p class="text-sm opacity-70">{subtitle}</p>{/if}
      </div>
      <button type="button" class="icon-btn" aria-label="Close" onclick={() => dialog.close()}>✕</button>
    </header>
    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
      {@render children()}
    </div>
    {#if footer}
      <footer class="border-t border-ink/20 px-4 py-2">{@render footer()}</footer>
    {/if}
  {/if}
</dialog>
