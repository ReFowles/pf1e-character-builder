<script lang="ts">
  import { app } from './lib/state.svelte';
  import { saveCharacter } from './lib/storage/local';
  import TopBar from './lib/ui/TopBar.svelte';
  import { TAB_LABELS } from './lib/sections';
  import CoreTab from './tabs/core/CoreTab.svelte';
  import CharacterTab from './tabs/character/CharacterTab.svelte';
  import MythicTab from './tabs/mythic/MythicTab.svelte';
  import SpellsTab from './tabs/spells/SpellsTab.svelte';
  import CompanionsTab from './tabs/companions/CompanionsTab.svelte';
  import SettingsTab from './tabs/settings/SettingsTab.svelte';
  import NotesTab from './tabs/notes/NotesTab.svelte';

  // Leave the Mythic tab if it gets disabled while open.
  $effect(() => {
    if (!app.tabs.includes(app.tab)) app.setTab('core');
  });

  // Autosave: serialize (which tracks every field), then write after a pause.
  let timer: ReturnType<typeof setTimeout>;
  $effect(() => {
    const snapshot = $state.snapshot(app.char);
    clearTimeout(timer);
    timer = setTimeout(() => app.persist(snapshot), 300);
  });

  // Flush pending edits if the page is closed mid-debounce.
  $effect(() => {
    const flush = () => {
      clearTimeout(timer);
      try {
        saveCharacter($state.snapshot(app.char));
      } catch {
        /* storage full: already reported */
      }
    };
    addEventListener('pagehide', flush);
    return () => removeEventListener('pagehide', flush);
  });

  // Keep the active tab on screen when the strip scrolls sideways.
  function keepVisible(node: HTMLElement, active: boolean) {
    const show = (on: boolean) => on && node.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    show(active);
    return { update: show };
  }
</script>

<TopBar />

<nav class="sticky top-0 z-10 border-b border-ink/30 bg-parchment/95 backdrop-blur print:hidden" aria-label="Sheet tabs">
  <div class="tab-strip mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-2 pt-2">
    {#each app.tabs as tab (tab)}
      <button
        type="button"
        class={['shrink-0 rounded-t-sm border border-b-0 py-1.5 font-display text-sm font-bold tracking-wider whitespace-nowrap uppercase', tab === 'settings' ? 'ml-auto px-3' : 'px-4']}
        class:bg-ink={app.tab === tab}
        class:text-paper={app.tab === tab}
        class:border-ink={app.tab === tab}
        class:border-transparent={app.tab !== tab}
        aria-current={app.tab === tab ? 'page' : undefined}
        use:keepVisible={app.tab === tab}
        aria-label={tab === 'settings' ? 'Settings' : undefined}
        title={tab === 'settings' ? 'Settings' : undefined}
        onclick={() => app.setTab(tab)}
      >
        {#if tab === 'settings'}
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
            <circle cx="10" cy="10" r="2.6" />
            <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
          </svg>
        {:else}{TAB_LABELS[tab]}{/if}
      </button>
    {/each}
  </div>
</nav>

<main class="mx-auto max-w-[1200px] p-2 print:max-w-none print:p-0">
  {#each app.tabs as tab (tab)}
    <div
      class={[
        'tab-panel',
        {
          'screen-hidden': app.tab !== tab,
          // Non-casters don't need a blank spells page.
          'print:hidden':
            tab === 'settings' || app.section(`tab:${tab}`).printHidden || (tab === 'spells' && !app.char.spellcasting.length) || (tab === 'companions' && !app.char.companions.length),
        },
      ]}
    >
      {#if tab === 'core'}<CoreTab />{:else if tab === 'character'}<CharacterTab />{:else if tab === 'companions'}<CompanionsTab />{:else if tab === 'spells'}<SpellsTab />{:else if tab === 'mythic'}<MythicTab />{:else if tab === 'notes'}<NotesTab />{:else}<SettingsTab />{/if}
    </div>
  {/each}
</main>

{#if app.toast}
  <div role="status" class="fixed right-4 bottom-4 z-50 max-w-sm rounded-sm bg-ink px-4 py-2 text-sm text-paper shadow-lg print:hidden">
    {app.toast}
  </div>
{/if}
