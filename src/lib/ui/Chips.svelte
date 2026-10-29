<script lang="ts">
  import Combobox from './Combobox.svelte';
  import { useSection } from './sectionContext';

  interface Props {
    items: string[];
    placeholder?: string;
    suggestions?: string[];
    label?: string;
    /** Editable outside the section's edit mode (e.g. conditions change every fight). */
    always?: boolean;
  }
  let { items = $bindable(), placeholder = 'Add…', suggestions = [], label, always = false }: Props = $props();
  const section = useSection();
  const editing = $derived(always || section.editing);
  let draft = $state('');

  function add() {
    const v = draft.trim();
    if (v && !items.includes(v)) items.push(v);
    draft = '';
  }
</script>

<!-- Chips size to their text; they're editable in the section's edit mode (or always). -->
<div class="flex flex-wrap items-center gap-1">
  {#each items as item, i (i)}
    {#if editing}
      <span class="chip">
        <input class="chip-input" bind:value={items[i]} aria-label="Edit {item}" onblur={() => !items[i].trim() && items.splice(i, 1)} />
        <button type="button" class="print:hidden" aria-label="Remove {item}" onclick={() => items.splice(i, 1)}>×</button>
      </span>
    {:else}
      <span class="chip">{item}</span>
    {/if}
  {/each}
  {#if editing}
    <Combobox class="w-36 print:hidden" {placeholder} aria-label={label ?? placeholder} suggestions={suggestions.filter((s) => !items.includes(s))} bind:value={draft} oncommit={add} />
  {:else if !items.length}
    <span class="text-sm italic opacity-40 print:hidden">None</span>
  {/if}
</div>
