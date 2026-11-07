<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLInputAttributes, 'value'> {
    value: number;
    /** Show a leading + for positive values when not focused. */
    signed?: boolean;
    /** Show 0 as an empty field (so the placeholder shows). */
    blankZero?: boolean;
  }
  let { value = $bindable(), signed = false, blankZero = false, class: cls = '', ...rest }: Props = $props();
  let focused = $state(false);
  let text = $state('');

  const shown = $derived(focused ? text : blankZero && !value ? '' : signed && value > 0 ? `+${value}` : String(value ?? 0));
</script>

<input
  {...rest}
  type="text"
  inputmode="decimal"
  class="num {cls}"
  value={shown}
  onfocus={(e) => {
    focused = true;
    text = blankZero && !value ? '' : String(value ?? 0);
    e.currentTarget.select();
  }}
  oninput={(e) => {
    text = e.currentTarget.value;
    const n = Number(text.replace(/^\+/, ''));
    if (text.trim() !== '' && Number.isFinite(n)) value = n;
  }}
  onblur={() => {
    focused = false;
    const n = Number(text.replace(/^\+/, ''));
    value = text.trim() === '' || !Number.isFinite(n) ? 0 : n;
  }}
/>
