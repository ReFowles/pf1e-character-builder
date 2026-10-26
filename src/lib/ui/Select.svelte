<script lang="ts" module>
  export interface SelectOption<T> {
    value: T;
    label: string;
    title?: string;
  }
</script>

<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

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

  const id = `select-${Math.random().toString(36).slice(2, 8)}`;
  let button: HTMLButtonElement;
  let list: HTMLDivElement;
  let open = $state(false);
  let active = $state(-1);
  let typed = '';
  let typedAt = 0;

  const same = (a: unknown, b: unknown) => a === b || (a == null && b == null);
  const selected = $derived(options.findIndex((o) => same(o.value, value)));
  const current = $derived(options[selected]);

  function place() {
    const r = button.getBoundingClientRect();
    list.style.minWidth = `${r.width}px`;
    list.style.left = `${Math.max(4, Math.min(r.left, innerWidth - list.offsetWidth - 4))}px`;
    // Below the trigger, or above it when there isn't room.
    const below = innerHeight - r.bottom;
    list.style.top = below < list.offsetHeight + 8 && r.top > below ? `${r.top - list.offsetHeight - 2}px` : `${r.bottom + 2}px`;
  }

  function choose(i: number) {
    const o = options[i];
    if (!o) return;
    value = o.value;
    onchange?.(o.value);
    list.hidePopover();
    button.focus();
  }

  function onToggle(e: ToggleEvent) {
    open = e.newState === 'open';
    if (!open) return;
    active = selected;
    place();
    list.querySelector<HTMLElement>(`[data-index="${Math.max(0, selected)}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  // The list is fixed-position, so close it rather than let it drift when the page scrolls.
  function onScroll(e: Event) {
    if (open && !list.contains(e.target as Node)) list.hidePopover();
  }

  function moveTo(i: number) {
    active = Math.max(0, Math.min(options.length - 1, i));
    list.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  function onKey(e: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        list.showPopover();
      }
      return;
    }
    if (e.key === 'ArrowDown') moveTo(active + 1);
    else if (e.key === 'ArrowUp') moveTo(active - 1);
    else if (e.key === 'Home') moveTo(0);
    else if (e.key === 'End') moveTo(options.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Tab') return list.hidePopover();
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

<svelte:window onscrollcapture={onScroll} onresize={() => open && list.hidePopover()} />

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
  <svg viewBox="0 0 20 20" fill="currentColor" class="select-chevron" aria-hidden="true"
    ><path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" /></svg
  >
</button>
<div bind:this={list} {id} popover="auto" role="listbox" class="select-list" aria-label={ariaLabel} ontoggle={onToggle}>
  {#each options as o, i (i)}
    <div
      id="{id}-{i}"
      data-index={i}
      role="option"
      tabindex="-1"
      aria-selected={i === selected}
      class={['select-option', { active: i === active }]}
      title={o.title}
      onpointermove={() => (active = i)}
      onclick={() => choose(i)}
      onkeydown={(e) => e.key === 'Enter' && choose(i)}
    >
      {o.label || ' '}
    </div>
  {/each}
</div>
