<script lang="ts" generics="K extends DbKind">
  import type { Snippet } from 'svelte';
  import { loadDb, searchByName, type DbKind } from '../db';
  import type { DbData } from '../db/types';
  import { useSection } from './sectionContext';

  type Entry = DbData[K][number];

  interface Props {
    kind: K;
    label: string;
    onpick: (entry: Entry) => void;
    filter?: (entry: Entry) => boolean;
    /** Secondary text for a result row. */
    detail?: Snippet<[Entry]>;
  }
  let { kind, label, onpick, filter, detail }: Props = $props();

  const section = useSection();
  let open = $state(false);
  let query = $state('');
  let data = $state<Entry[] | null>(null);
  let error = $state('');
  let active = $state(0);
  const listId = `db-results-${Math.random().toString(36).slice(2, 8)}`;

  const results = $derived.by(() => {
    if (!data) return [];
    const pool = filter ? data.filter(filter) : data;
    return searchByName(pool, query) as Entry[];
  });

  async function start() {
    open = true;
    try {
      data = (await loadDb(kind)) as Entry[];
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  function pick(e: Entry) {
    onpick(e);
    query = '';
    active = 0;
  }
</script>

{#if !section.editing}
  <!-- Find is a structural action: only in the section's edit mode. -->
{:else if !open}
  <button type="button" class="add-btn print:hidden" onclick={start}>⌕ {label}</button>
{:else}
  <div class="relative flex min-w-48 flex-1 flex-col print:hidden">
    <div class="flex items-center gap-1">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="flex-1 border border-ink/30"
        placeholder={data ? `${label}…` : 'Loading…'}
        aria-label={label}
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        autofocus
        bind:value={query}
        oninput={() => (active = 0)}
        onkeydown={(e) => {
          if (e.key === 'ArrowDown') (e.preventDefault(), (active = Math.min(active + 1, results.length - 1)));
          else if (e.key === 'ArrowUp') (e.preventDefault(), (active = Math.max(active - 1, 0)));
          else if (e.key === 'Enter' && results[active]) (e.preventDefault(), pick(results[active]));
          else if (e.key === 'Escape') open = false;
        }}
      />
      <button type="button" class="icon-btn" aria-label="Close search" onclick={() => (open = false)}>✕</button>
    </div>
    {#if error}<p class="absolute top-full left-0 z-30 mt-1 bg-paper px-2 text-xs text-accent">{error}</p>{/if}
    {#if results.length}
      <ul id={listId} role="listbox" class="absolute top-full right-0 left-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-sm border border-ink/30 bg-paper text-sm shadow-lg">
        {#each results as r, i (r.name)}
          <li role="option" aria-selected={i === active}>
            <button
              type="button"
              class={['db-option flex w-full flex-col px-2 py-1 text-left', { active: i === active }]}
              onmouseenter={() => (active = i)}
              onclick={() => pick(r)}
            >
              <span class="font-semibold">{r.name}</span>
              {#if detail}<span class="text-xs opacity-70">{@render detail(r)}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else if query && data}
      <p class="absolute top-full left-0 z-30 mt-1 rounded-sm bg-paper px-2 py-1 text-xs italic shadow">No matches.</p>
    {/if}
  </div>
{/if}
