<script lang="ts">
  interface Props {
    items: string[];
    placeholder?: string;
    suggestions?: string[];
    label?: string;
  }
  let { items = $bindable(), placeholder = 'Add…', suggestions = [], label }: Props = $props();
  let draft = $state('');
  const listId = `chips-${Math.random().toString(36).slice(2, 8)}`;

  function add() {
    const v = draft.trim();
    if (v && !items.includes(v)) items.push(v);
    draft = '';
  }
</script>

<div class="flex flex-wrap items-center gap-1">
  {#each items as item, i (item)}
    <span class="chip">
      {item}
      <button
        type="button"
        class="print:hidden"
        aria-label="Remove {item}"
        onclick={() => items.splice(i, 1)}>×</button
      >
    </span>
  {/each}
  <input
    class="min-w-24 flex-1 print:hidden"
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
</div>
