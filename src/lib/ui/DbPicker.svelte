<script lang="ts" generics="K extends DbKind">
  import type { Snippet } from 'svelte';
  import { loadDb, searchByName, type DbKind } from '../db';
  import type { DbData } from '../db/types';

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

  let open = $state(false);
  let query = $state('');
  let data = $state<Entry[] | null>(null);
  let error = $state('');
  let active = $state(0);

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

{#if !open}
  <button type="button" class="add-btn print:hidden" onclick={start}>⌕ {label}</button>
{:else}
  <div class="relative flex flex-col gap-1 print:hidden">
    <div class="flex items-center gap-1">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="flex-1 border border-ink/30"
        placeholder={data ? `${label}…` : 'Loading…'}
        aria-label={label}
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="db-results-{kind}"
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
    {#if error}<p class="text-xs text-accent">{error}</p>{/if}
    {#if results.length}
      <ul id="db-results-{kind}" role="listbox" class="max-h-72 overflow-y-auto rounded-sm border border-ink/30 bg-paper text-sm shadow-lg">
        {#each results as r, i (r.name)}
          <li role="option" aria-selected={i === active}>
            <button
              type="button"
              class="flex w-full flex-col px-2 py-1 text-left hover:bg-ink/5"
              class:bg-ink={i === active}
              class:text-paper={i === active}
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
      <p class="text-xs italic opacity-60">No matches.</p>
    {/if}
  </div>
{/if}
