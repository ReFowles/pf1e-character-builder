<script lang="ts" generics="T extends { id: string }">
  import type { Snippet } from 'svelte';

  interface Props {
    items: T[];
    item: Snippet<[T, number]>;
    /** Blank card for print, giving room to write one more entry. */
    blank?: Snippet;
    onadd?: () => void;
    /** Extra controls beside the add button (e.g. a database search). */
    tools?: Snippet;
    addLabel?: string;
    empty?: string;
    class?: string;
  }
  let {
    items = $bindable(),
    item,
    blank,
    onadd,
    tools,
    addLabel = 'Add',
    empty = 'Nothing yet.',
    class: cls = 'flex flex-col gap-2',
  }: Props = $props();

  function move(i: number, by: number) {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const [x] = items.splice(i, 1);
    items.splice(j, 0, x);
  }
</script>

<div class={cls}>
  {#each items as it, i (it.id)}
    <div class="group relative min-h-[4.75rem] break-inside-avoid rounded-sm border border-ink/20 p-1.5 pr-7 print:min-h-0">
      {@render item(it, i)}
      <div class="absolute top-0.5 right-0.5 flex flex-col print:hidden">
        <button type="button" class="icon-btn text-accent" aria-label="Remove" onclick={() => items.splice(i, 1)}>✕</button>
        <button type="button" class="icon-btn" aria-label="Move up" disabled={i === 0} onclick={() => move(i, -1)}>↑</button>
        <button type="button" class="icon-btn" aria-label="Move down" disabled={i === items.length - 1} onclick={() => move(i, 1)}>↓</button>
      </div>
    </div>
  {:else}
    <p class="text-sm italic opacity-60 print:hidden">{empty}</p>
  {/each}
  <div class="hidden rounded-sm border border-ink/20 p-1.5 print:block">
    {#if blank}{@render blank()}{:else}<div class="h-8"></div>{/if}
  </div>
</div>
{#if onadd || tools}
  <div class="flex flex-wrap items-start gap-2 print:hidden">
    {#if onadd}<button type="button" class="add-btn" onclick={onadd}>+ {addLabel}</button>{/if}
    {#if tools}{@render tools()}{/if}
  </div>
{/if}
