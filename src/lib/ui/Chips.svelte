<script lang="ts">
  import { useSection } from './sectionContext';

  interface Props {
    items: string[];
    placeholder?: string;
    suggestions?: string[];
    label?: string;
  }
  let { items = $bindable(), placeholder = 'Add…', suggestions = [], label }: Props = $props();
  const section = useSection();
  let draft = $state('');
  const listId = `chips-${Math.random().toString(36).slice(2, 8)}`;

  function add() {
    const v = draft.trim();
    if (v && !items.includes(v)) items.push(v);
    draft = '';
  }
</script>

<!-- Chips size to their text; they're editable only in the section's edit mode. -->
<div class="flex flex-wrap items-center gap-1">
  {#each items as item, i (i)}
    {#if section.editing}
      <span class="chip">
        <input class="chip-input" bind:value={items[i]} aria-label="Edit {item}" onblur={() => !items[i].trim() && items.splice(i, 1)} />
        <button type="button" class="print:hidden" aria-label="Remove {item}" onclick={() => items.splice(i, 1)}>×</button>
      </span>
    {:else}
      <span class="chip">{item}</span>
    {/if}
  {/each}
  {#if section.editing}
    <input
      class="w-36 print:hidden"
      {placeholder}
      aria-label={label ?? placeholder}
      list={suggestions.length ? listId : undefined}
      bind:value={draft}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          add();
        }
      }}
      onblur={add}
    />
    {#if suggestions.length}
      <datalist id={listId}>
        {#each suggestions as s (s)}<option value={s}></option>{/each}
      </datalist>
    {/if}
  {:else if !items.length}
    <span class="text-sm italic opacity-40 print:hidden">None</span>
  {/if}
</div>
