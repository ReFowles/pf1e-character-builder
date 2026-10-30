<script lang="ts" module>
  export interface ListOption {
    label: string;
    title?: string;
    /** Options sharing a group get a small heading above the first one. */
    group?: string;
  }
</script>

<script lang="ts">
  // The floating option list behind Select and Combobox: a top-layer popover with grouped rows.
  interface Props {
    id: string;
    options: ListOption[];
    /** Highlighted row (keyboard or pointer). */
    active: number;
    /** Row marked aria-selected. */
    selected: number;
    popover: 'auto' | 'manual';
    /** The list element, for showPopover()/hidePopover() and positioning. */
    el?: HTMLDivElement;
    onchoose: (i: number) => void;
    onbeforetoggle?: (e: ToggleEvent) => void;
    ontoggle?: (e: ToggleEvent) => void;
    onclick?: (e: MouseEvent) => void;
    onpointerdown?: (e: PointerEvent) => void;
  }
  let { id, options, active = $bindable(), selected, popover, el = $bindable(), onchoose, onbeforetoggle, ontoggle, onclick, onpointerdown }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div bind:this={el} {id} {popover} role="listbox" tabindex="-1" class="select-list" {onbeforetoggle} {ontoggle} {onclick} {onpointerdown}>
  {#each options as o, i (i)}
    {#if o.group && o.group !== options[i - 1]?.group}<div class="select-group" role="presentation">{o.group}</div>{/if}
    <div
      id="{id}-{i}"
      data-index={i}
      role="option"
      tabindex="-1"
      aria-selected={i === selected}
      class={['select-option', { active: i === active }]}
      title={o.title}
      onpointermove={() => (active = i)}
      onclick={() => onchoose(i)}
      onkeydown={(e) => e.key === 'Enter' && onchoose(i)}
    >
      {o.label}
    </div>
  {/each}
</div>
