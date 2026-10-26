<script lang="ts">
  import { app, type Tab } from './lib/state.svelte';
  import { saveCharacter } from './lib/storage/local';
  import TopBar from './lib/ui/TopBar.svelte';
  import ConfigDrawer from './lib/ui/ConfigDrawer.svelte';
  import CombatTab from './tabs/combat/CombatTab.svelte';
  import CharacterTab from './tabs/character/CharacterTab.svelte';
  import MythicTab from './tabs/mythic/MythicTab.svelte';
  import SpellsTab from './tabs/spells/SpellsTab.svelte';

  const LABELS: Record<Tab, string> = { combat: 'Combat', character: 'Character', spells: 'Spells', mythic: 'Mythic' };

  // Leave the Mythic tab if it gets disabled while open.
  $effect(() => {
    if (!app.tabs.includes(app.tab)) app.setTab('combat');
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
</script>

<TopBar />

<nav class="sticky top-0 z-10 flex gap-1 border-b border-ink/30 bg-parchment/95 px-2 pt-2 backdrop-blur print:hidden" aria-label="Sheet tabs">
  {#each app.tabs as tab (tab)}
    <button
      type="button"
      class="rounded-t-sm border border-b-0 px-4 py-1.5 font-display text-sm font-bold tracking-wider uppercase"
      class:bg-ink={app.tab === tab}
      class:text-paper={app.tab === tab}
      class:border-ink={app.tab === tab}
      class:border-transparent={app.tab !== tab}
      aria-current={app.tab === tab ? 'page' : undefined}
      onclick={() => app.setTab(tab)}>{LABELS[tab]}</button
    >
  {/each}
</nav>

<main class="mx-auto max-w-[1200px] p-2 print:max-w-none print:p-0">
  {#each app.tabs as tab (tab)}
    <div
      class={[
        'tab-panel',
        {
          'screen-hidden': app.tab !== tab,
          // Non-casters don't need a blank spells page.
          'print:hidden': app.section(`tab:${tab}`).printHidden || (tab === 'spells' && !app.char.spellcasting.length),
        },
      ]}
    >
      {#if tab === 'combat'}<CombatTab />{:else if tab === 'character'}<CharacterTab />{:else if tab === 'spells'}<SpellsTab />{:else}<MythicTab />{/if}
    </div>
  {/each}
</main>

<ConfigDrawer />

{#if app.toast}
  <div role="status" class="fixed right-4 bottom-4 z-50 max-w-sm rounded-sm bg-ink px-4 py-2 text-sm text-paper shadow-lg print:hidden">
    {app.toast}
  </div>
{/if}
