<script lang="ts" module>
  export interface SelectOption<T> {
    value: T;
    label: string;
    title?: string;
    /** Options sharing a group get a small heading above the first one. */
    group?: string;
  }

  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

  /** Options from plain values; labels default to the capitalized value. */
  export function opts<T extends string | number>(values: readonly T[], label: (v: T) => string = (v) => cap(String(v))): SelectOption<T>[] {
    return values.map((value) => ({ value, label: label(value) }));
  }
</script>

<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { uid } from '../model/id';
  import Chevron from './Chevron.svelte';
  import PopoverList from './PopoverList.svelte';
  import { placeList, revealInList, scrollAction } from './popoverList';

  interface Props {
    value: T;
    options: SelectOption<T>[];
    /** Called after a choice is made (use instead of bind:value for custom handling). */
    onchange?: (value: T) => void;
    class?: string;
    placeholder?: string;
    title?: string;
    /** Custom content for the closed face (defaults to the selected label). */
    display?: Snippet<[SelectOption<T> | undefined]>;
    'aria-label'?: string;
  }
  let { value = $bindable(), options, onchange, class: cls = '', placeholder = '', title, display, 'aria-label': ariaLabel }: Props = $props();

  const id = `select-${uid()}`;
  let button: HTMLButtonElement;
  let list = $state<HTMLDivElement>();
  let open = $state(false);
  let active = $state(-1);
  let openedAt = 0;
  let typed = '';
  let typedAt = 0;

  const same = (a: unknown, b: unknown) => a === b || (a == null && b == null);
  const selected = $derived(options.findIndex((o) => same(o.value, value)));
  const current = $derived(options[selected]);
  const rows = $derived(options.map((o) => ({ label: o.label || ' ', title: o.title, group: o.group })));

  function choose(i: number) {
    const o = options[i];
    if (!o) return;
    value = o.value;
    onchange?.(o.value);
    list?.hidePopover();
    button.focus();
  }

  // beforetoggle is synchronous, so keys pressed right after opening see the right state.
  function onBeforeToggle(e: ToggleEvent) {
    open = e.newState === 'open';
    if (open) {
      active = selected;
      openedAt = Date.now();
    }
  }

  // toggle fires once the list is showing and measurable.
  function onToggle(e: ToggleEvent) {
    if (e.newState !== 'open' || !list) return;
    placeList(button, list);
    revealInList(list, list.querySelector<HTMLElement>(`[data-index="${Math.max(0, selected)}"]`));
  }

  // The list is fixed-position, so close it rather than let it drift when the page (or a
  // container holding the trigger) scrolls. A scroll right after opening is the trigger
  // being scrolled into view: follow it instead.
  function onScroll(e: Event) {
    if (!open || !list) return;
    const act = scrollAction(e, button, list, openedAt);
    if (act === 'place') placeList(button, list);
    else if (act === 'hide') list.hidePopover();
  }

  function moveTo(i: number) {
    active = Math.max(0, Math.min(options.length - 1, i));
    if (list) revealInList(list, list.querySelector<HTMLElement>(`[data-index="${active}"]`));
  }

  function onKey(e: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        list?.showPopover();
      }
      return;
    }
    if (e.key === 'ArrowDown') moveTo(active + 1);
    else if (e.key === 'ArrowUp') moveTo(active - 1);
    else if (e.key === 'Home') moveTo(0);
    else if (e.key === 'End') moveTo(options.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Tab') return list?.hidePopover();
    else if (e.key.length === 1) {
      // Type-ahead: jump to the first option starting with what was typed.
      const now = Date.now();
      typed = now - typedAt > 700 ? e.key.toLowerCase() : typed + e.key.toLowerCase();
      typedAt = now;
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed));
      if (i >= 0) moveTo(i);
      return;
    } else return;
    e.preventDefault();
  }
</script>

<svelte:window onscrollcapture={onScroll} onresize={() => open && list?.hidePopover()} />

<button
  bind:this={button}
  type="button"
  class="select-btn {cls}"
  role="combobox"
  aria-haspopup="listbox"
  aria-expanded={open}
  aria-controls={id}
  aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
  aria-label={ariaLabel}
  title={title ?? current?.title}
  popovertarget={id}
  onkeydown={onKey}
>
  <span class="min-w-0 flex-1 truncate">
    {#if display}{@render display(current)}{:else if current}{current.label}{:else}<span class="opacity-50">{placeholder}</span>{/if}
  </span>
  <Chevron open class="select-chevron" />
</button>
<!-- Clicks are cancelled so a wrapping <label> doesn't re-click the trigger and reopen the list. -->
<PopoverList {id} options={rows} bind:active {selected} popover="auto" bind:el={list} onchoose={choose} onbeforetoggle={onBeforeToggle} ontoggle={onToggle} onclick={(e) => e.preventDefault()} />
