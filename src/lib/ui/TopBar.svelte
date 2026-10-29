<script lang="ts">
  import { app } from '../state.svelte';
  import AboutDialog from './AboutDialog.svelte';
  import Select from './Select.svelte';
  import { rolls } from '../dice/rolls.svelte';

  let about: AboutDialog;

  let menu: HTMLDivElement;
  // Shared by the wide button row and the small-screen ☰ menu.
  const ACTIONS: { label: string; title?: string; run: () => void }[] = [
    { label: 'Import JSON', run: () => app.importJson() },
    { label: 'Export JSON', run: () => app.exportJson() },
    { label: 'Print / PDF', title: 'Print, or choose “Save as PDF” in the print dialog', run: () => print() },
    { label: 'About', run: () => about.open() },
    { label: 'Roll log', run: () => rolls.toggle(true) },
  ];

  const sorted = $derived([...app.roster].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
</script>

<header class="flex flex-wrap items-center gap-2 border-b border-ink/30 bg-paper px-3 py-2 print:hidden">
  <label class="flex items-center gap-1 text-sm">
    <span class="sr-only">Character</span>
    <Select
      class="max-w-56 border-ink/30"
      aria-label="Character"
      value={app.char.id}
      options={sorted.map((r) => ({ value: r.id, label: r.name || 'Unnamed character' }))}
      onchange={(id) => app.switchTo(id)}
    />
  </label>
  <button type="button" class="btn p-1.5" title="New character" aria-label="New character" onclick={() => app.create()}>
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>
  </button>
  <button type="button" class="btn p-1.5" title="Duplicate character" aria-label="Duplicate character" onclick={() => app.duplicate()}>
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="1.5"/><path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7"/></svg>
  </button>
  <button type="button" class="btn p-1.5 hover:text-accent" title="Delete character" aria-label="Delete character" onclick={() => app.remove()}>
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true"><path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5A1 1 0 0 0 7.7 16.5h4.6a1 1 0 0 0 1-.9L14 6M8.5 9v4.5M11.5 9v4.5"/></svg>
  </button>
  <div class="ml-auto flex flex-wrap gap-2">
    {#each ACTIONS.filter((a) => a.label !== 'Roll log') as a (a.label)}
      <button type="button" class="btn hidden sm:inline-block" title={a.title} onclick={a.run}>{a.label}</button>
    {/each}
    <button type="button" class="btn relative p-1.5" title="Roll log and dice" aria-label="Roll log{rolls.unread ? ` (${rolls.unread} new)` : ''}" onclick={() => rolls.toggle()}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" class="size-4" aria-hidden="true">
        <path d="M10 1.8 17.2 6v8L10 18.2 2.8 14V6L10 1.8Z" />
        <path d="M10 1.8 6 8.5h8L10 1.8ZM2.8 6 6 8.5 4.2 13.3 2.8 14M17.2 6 14 8.5l1.8 4.8 1.4.7M6 8.5l1.6 5.3h4.8L14 8.5M7.6 13.8 10 18.2l2.4-4.4" />
      </svg>
      {#if rolls.unread}<span class="roll-badge">{rolls.unread}</span>{/if}
    </button>
    <button type="button" class="btn p-1.5 sm:hidden" aria-label="Menu" title="Menu" popovertarget="app-menu">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" class="size-4" aria-hidden="true"><path d="M3.5 6h13M3.5 10h13M3.5 14h13" /></svg>
    </button>
  </div>
  <div bind:this={menu} id="app-menu" popover="auto" role="menu" class="app-menu">
    {#each ACTIONS as a (a.label)}
      <button
        type="button"
        role="menuitem"
        class="rounded-sm px-3 py-1.5 text-left text-sm hover:bg-ink/10"
        title={a.title}
        onclick={() => {
          menu.hidePopover();
          a.run();
        }}>{a.label}</button
      >
    {/each}
  </div>
</header>
<AboutDialog bind:this={about} />
