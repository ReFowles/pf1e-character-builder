<script lang="ts">
  import { app, type Tab } from '../state.svelte';
  import { theme } from '../theme.svelte';

  const LABELS: Record<Tab, string> = { combat: 'Core', character: 'Character', spells: 'Spells', mythic: 'Mythic' };
  import { SECTIONS } from '../sections';
  import Select, { opts } from './Select.svelte';
</script>

{#if app.configOpen}
  <div class="fixed inset-0 z-40 bg-ink/40 print:hidden" role="presentation" onclick={() => (app.configOpen = false)}></div>
  <aside class="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col gap-3 overflow-y-auto bg-paper p-4 shadow-xl print:hidden" aria-label="Sheet configuration">
    <div class="flex items-center justify-between">
      <h2 class="font-display text-lg font-bold">Configuration</h2>
      <button type="button" class="icon-btn" aria-label="Close" onclick={() => (app.configOpen = false)}>✕</button>
    </div>

    <label class="flex items-center gap-2 text-sm" title="Saved on this device. Printing always uses the light theme.">
      <input type="checkbox" bind:checked={() => theme.dark, (v) => (theme.dark = v)} />
      Dark mode
    </label>

    <label class="field">
      <Select bind:value={app.char.xp.track} options={opts(['slow', 'medium', 'fast'] as const)} aria-label="Experience track" />
      <span class="field-label">Experience track</span>
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={app.char.maxHpFirstLevel} />
      Max hit points at first level
    </label>

    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={app.char.mythic.enabled} />
      Mythic tab
    </label>

    {#each app.tabs as tab (tab)}
      <table class="w-full text-sm">
        <thead>
          <tr>
            <th>{LABELS[tab]} tab</th>
            <th class="w-14 text-center">Screen</th>
            <th class="w-14 text-center">Print</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-ink/10">
            <td class="italic">Whole tab</td>
            <td></td>
            <td class="text-center">
              <input
                type="checkbox"
                aria-label="Print {tab} tab"
                checked={!app.section(`tab:${tab}`).printHidden}
                onchange={(e) => app.setSection(`tab:${tab}`, { printHidden: !e.currentTarget.checked })}
              />
            </td>
          </tr>
          {#each SECTIONS.filter((s) => s.tab === tab) as s (s.id)}
            {@const ui = app.section(s.id)}
            <tr class="border-b border-ink/10">
              <td>{s.title}</td>
              <td class="text-center">
                <input
                  type="checkbox"
                  aria-label="Show {s.title} on screen"
                  checked={!ui.hidden}
                  onchange={(e) => app.setSection(s.id, { hidden: !e.currentTarget.checked })}
                />
              </td>
              <td class="text-center">
                <input
                  type="checkbox"
                  aria-label="Print {s.title}"
                  checked={!ui.printHidden}
                  onchange={(e) => app.setSection(s.id, { printHidden: !e.currentTarget.checked })}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/each}

    <button
      type="button"
      class="btn self-start"
      onclick={() => {
        app.char.ui.sections = { macros: { hidden: false, collapsed: false, printHidden: true } };
      }}>Reset layout</button
    >
  </aside>
{/if}
