<script lang="ts" generics="T extends { id: string }">
  import type { Snippet } from 'svelte';
  import { moveItem } from '../arrays';
  import EditHint from './EditHint.svelte';
  import { useSection } from './sectionContext';

  interface Props {
    items: T[];
    /** Number of data columns rendered by `row` (for the blank print row). */
    cols: number;
    head: Snippet;
    row: Snippet<[T, number]>;
    /** Full-width line under each row (notes, descriptions). */
    detail?: Snippet<[T, number]>;
    /** Whether an item's detail line prints (e.g. only when it has text). Defaults to always. */
    detailPrints?: (item: T) => boolean;
    onadd?: () => void;
    /** Extra controls beside the add button (e.g. a database search). */
    tools?: Snippet;
    /** Needed when `items` is a filtered view rather than the source array. */
    onremove?: (item: T) => void;
    reorder?: boolean;
    addLabel?: string;
    empty?: string;
    class?: string;
  }
  let {
    items = $bindable(),
    cols,
    head,
    row,
    detail,
    detailPrints,
    onadd,
    tools,
    onremove,
    reorder = true,
    addLabel = 'Add',
    empty = 'Nothing yet.',
    class: cls = '',
  }: Props = $props();

  const section = useSection();
</script>

<div>
  <table class="dyn-table {cls}">
    <thead>
      <tr>
        {@render head()}
        {#if section.editing}<th class="w-0 print:hidden"><span class="sr-only">Actions</span></th>{/if}
      </tr>
    </thead>
    {#snippet actions(item: T, i: number)}
      {#if section.editing}
        <td class="row-actions print:hidden">
          <div class="flex">
            {#if reorder}
              <button type="button" class="icon-btn" aria-label="Move up" disabled={i === 0} onclick={() => moveItem(items, i, i - 1)}>↑</button>
              <button type="button" class="icon-btn" aria-label="Move down" disabled={i === items.length - 1} onclick={() => moveItem(items, i, i + 1)}>↓</button>
            {/if}
            <button type="button" class="icon-btn text-accent" aria-label="Remove row" onclick={() => (onremove ? onremove(item) : items.splice(i, 1))}>✕</button>
          </div>
        </td>
      {/if}
    {/snippet}
    {#if detail}
      <!-- One tbody per item keeps a row and its detail line together across page breaks. -->
      {#each items as item, i (item.id)}
        <tbody class="dyn-item">
          <tr class="has-detail">
            {@render row(item, i)}
            {@render actions(item, i)}
          </tr>
          <tr class={['detail-row', { 'print:hidden': detailPrints && !detailPrints(item) }]}>
            <td colspan={cols}>{@render detail(item, i)}</td>
            {#if section.editing}<td class="row-actions print:hidden"></td>{/if}
          </tr>
        </tbody>
      {/each}
    {/if}
    <tbody>
      {#if !detail}
        {#each items as item, i (item.id)}
          <tr>
            {@render row(item, i)}
            {@render actions(item, i)}
          </tr>
        {/each}
      {/if}
      {#if !items.length}
        <tr class="print:hidden"><td colspan={cols + 1} class="py-2 text-center text-sm italic opacity-60">{empty}{#if onadd || tools}<EditHint />{/if}</td></tr>
      {/if}
      <!-- One blank row on paper for handwritten additions. -->
      <tr class="print-row hidden print:table-row">
        {#each { length: cols }, c (c)}<td>&nbsp;</td>{/each}
      </tr>
    </tbody>
  </table>
</div>
{#if section.editing && (onadd || tools)}
  <div class="flex flex-wrap items-start gap-2 print:hidden">
    {#if onadd}<button type="button" class="add-btn" onclick={onadd}>+ {addLabel}</button>{/if}
    {#if tools}{@render tools()}{/if}
  </div>
{/if}
