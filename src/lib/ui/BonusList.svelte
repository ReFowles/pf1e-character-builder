<script lang="ts">
  import { make } from '../model/defaults';
  import { BONUS_TYPES } from '../model/types';
  import { app } from '../state.svelte';
  import { KEY_LABELS, keyShort } from '../rules/keys';
  import NumInput from './NumInput.svelte';
  import { useSection } from './sectionContext';
  import Select, { opts } from './Select.svelte';

  interface Props {
    /** Keys this list shows; the first is used for new entries. */
    keys: string[];
    label?: string;
    /** Names for keys outside the fixed key list (a character's own skills). */
    labels?: Record<string, string>;
    /** Example source shown in empty source fields. */
    placeholder?: string;
  }
  let { keys, label = 'Misc bonuses', labels = {}, placeholder = 'Source' }: Props = $props();
  const keyOptions = $derived(keys.map((k) => ({ value: k, label: labels[k] ?? keyShort(k), title: KEY_LABELS[k] ?? labels[k] })));
  const section = useSection();
  const rows = $derived(app.char.bonuses.filter((b) => keys.includes(b.key)));

  function remove(id: string) {
    const i = app.char.bonuses.findIndex((b) => b.id === id);
    if (i >= 0) app.char.bonuses.splice(i, 1);
  }
</script>

{#if rows.length || section.editing}
  <div class={['flex flex-col gap-1 text-sm', { 'print:hidden': rows.length === 0 }]}>
    <div class="flex items-center gap-2">
      <span class="field-label">{label}</span>
      {#if section.editing}
        <button type="button" class="icon-btn print:hidden" aria-label="Add {label}" onclick={() => app.char.bonuses.push({ ...make.bonus(), key: keys[0] })}>＋</button>
      {/if}
    </div>
    {#each rows as b (b.id)}
      <!-- One row that never wraps: the source field gives way first, the ✕ stays at the end. -->
      <div class="flex flex-nowrap items-center gap-1">
        <NumInput class="w-11 shrink-0" bind:value={b.value} signed aria-label="Bonus value" />
        {#if keys.length > 1}
          <Select class="w-24 shrink-0" bind:value={b.key} options={keyOptions} aria-label="Applies to" />
        {/if}
        <Select class="w-24 shrink-0" bind:value={b.type} options={opts(BONUS_TYPES)} aria-label="Bonus type" />
        <input class="min-w-0 flex-1" bind:value={b.source} {placeholder} aria-label="Source" />
        {#if section.editing}
          <button type="button" class="icon-btn shrink-0 text-accent print:hidden" aria-label="Remove bonus" onclick={() => remove(b.id)}>✕</button>
        {/if}
      </div>
    {/each}
  </div>
{/if}
