<script lang="ts" module>
  export interface ComboOption {
    value: string;
    /** Shown in the list; defaults to the value. */
    label?: string;
    title?: string;
    /** Options sharing a group get a small heading above the first one. */
    group?: string;
  }
</script>

<script lang="ts">
  import { placeList } from './popoverList';

  interface Props {
    value: string;
    /** Rich options (with groups); or pass plain `suggestions`. */
    options?: ComboOption[];
    suggestions?: string[];
    placeholder?: string;
    class?: string;
    title?: string;
    'aria-label'?: string;
    /** A suggestion was picked, Enter was pressed, or the field lost focus after a change. */
    oncommit?: (value: string, picked: boolean) => void;
    /** The list is about to open: a chance to lazy-load options. */
    onopen?: () => void;
  }
  let { value = $bindable(''), options, suggestions = [], placeholder = '', class: cls = '', title, 'aria-label': ariaLabel, oncommit, onopen }: Props = $props();

  const id = `combo-${Math.random().toString(36).slice(2, 8)}`;
  let input: HTMLInputElement;
  let list: HTMLDivElement;
  let open = $state(false);
  let active = $state(-1);
  let committed = value;

  const all: ComboOption[] = $derived(options ?? suggestions.map((s) => ({ value: s })));
  /** Prefix matches first, then anything containing the text; everything while the field is empty. */
  const matches = $derived.by(() => {
    const q = value.trim().toLowerCase();
    if (!q) return all.slice(0, 200);
    const label = (o: ComboOption) => (o.label ?? o.value).toLowerCase();
    return all
      .map((o, i) => ({ o, i, rank: label(o).startsWith(q) ? 0 : label(o).includes(q) ? 1 : 2 }))
      .filter((x) => x.rank < 2)
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .map((x) => x.o)
      .slice(0, 200);
  });

  function show() {
    if (open || !all.length) return;
    onopen?.();
    list.showPopover();
    open = true;
    active = -1;
    placeList(input, list);
  }
  function hide() {
    if (!open) return;
    list.hidePopover();
    open = false;
    active = -1;
  }
  function commit(picked: boolean) {
    if (!picked && value === committed) return;
    committed = value;
    oncommit?.(value, picked);
  }
  function choose(i: number) {
    const o = matches[i];
    if (!o) return;
    value = o.value;
    hide();
    commit(true);
  }
  function moveTo(i: number) {
    if (!matches.length) return;
    active = (i + matches.length) % matches.length;
    list.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) show();
      moveTo(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) show();
      moveTo(active - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && active >= 0) choose(active);
      else {
        hide();
        commit(false);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        hide();
      }
    } else if (e.key === 'Tab') hide();
  }
  function onInput() {
    if (!open) show();
    else placeList(input, list);
    active = -1;
    if (open && !matches.length) hide();
  }
  // The list is fixed-position: close it instead of letting it drift when the page scrolls.
  function onScroll(e: Event) {
    if (open && !list.contains(e.target as Node)) hide();
  }
</script>

<svelte:window onscrollcapture={onScroll} onresize={hide} />

<input
  bind:this={input}
  class={cls}
  bind:value
  {placeholder}
  {title}
  aria-label={ariaLabel}
  role="combobox"
  aria-autocomplete="list"
  aria-expanded={open}
  aria-controls={id}
  aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
  autocomplete="off"
  onfocus={show}
  onclick={show}
  oninput={onInput}
  onkeydown={onKey}
  onblur={() => {
    hide();
    commit(false);
  }}
/>
<!-- pointerdown is cancelled so picking an option doesn't blur the input first. -->
<div bind:this={list} {id} popover="manual" role="listbox" tabindex="-1" class="select-list" onpointerdown={(e) => e.preventDefault()}>
  {#each matches as o, i (o.value)}
    {#if o.group && o.group !== matches[i - 1]?.group}<div class="select-group" role="presentation">{o.group}</div>{/if}
    <div
      id="{id}-{i}"
      data-index={i}
      role="option"
      tabindex="-1"
      aria-selected={i === active}
      class={['select-option', { active: i === active }]}
      title={o.title}
      onpointermove={() => (active = i)}
      onclick={() => choose(i)}
      onkeydown={(e) => e.key === 'Enter' && choose(i)}
    >
      {o.label ?? o.value}
    </div>
  {/each}
</div>
