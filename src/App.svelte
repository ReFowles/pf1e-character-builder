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
  import RollDrawer from './lib/dice/RollDrawer.svelte';
  import Tour from './lib/ui/Tour.svelte';
  import RollFab from './lib/dice/RollFab.svelte';

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
        class={['shrink-0 rounded-t-sm border border-b-0 py-1.5 font-display text-sm font-bold tracking-wider whitespace-nowrap uppercase', tab === 'settings' ? 'px-3' : 'px-4']}
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
            <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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

<RollDrawer />
<RollFab />
<Tour />

{#if app.toast}
  <div role="status" class="fixed right-4 bottom-20 z-50 max-w-sm rounded-sm bg-ink px-4 py-2 text-sm text-paper shadow-lg print:hidden">
    {app.toast}
  </div>
{/if}
