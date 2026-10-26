<script lang="ts">
  import { make } from '../model/defaults';
  import { BONUS_TYPES } from '../model/types';
  import { app } from '../state.svelte';
  import { KEY_LABELS } from '../rules/keys';
  import NumInput from './NumInput.svelte';

  interface Props {
    /** Keys this list shows; the first is used for new entries. */
    keys: string[];
    label?: string;
  }
  let { keys, label = 'Misc bonuses' }: Props = $props();
  const rows = $derived(app.char.bonuses.filter((b) => keys.includes(b.key)));

  function remove(id: string) {
    const i = app.char.bonuses.findIndex((b) => b.id === id);
    if (i >= 0) app.char.bonuses.splice(i, 1);
  }
</script>

<div class={["flex flex-col gap-1 text-sm", { "print:hidden": rows.length === 0 }]}>
  <div class="flex items-center gap-2">
    <span class="field-label">{label}</span>
    <button
      type="button"
      class="icon-btn print:hidden"
      aria-label="Add {label}"
      onclick={() => app.char.bonuses.push({ ...make.bonus(), key: keys[0] })}>＋</button
    >
  </div>
  {#each rows as b (b.id)}
    <div class="flex items-center gap-1">
      <NumInput class="w-12" bind:value={b.value} signed aria-label="Bonus value" />
      {#if keys.length > 1}
        <select class="w-28" bind:value={b.key} aria-label="Applies to">
          {#each keys as k (k)}<option value={k}>{KEY_LABELS[k] ?? k}</option>{/each}
        </select>
      {/if}
      <select class="w-24" bind:value={b.type} aria-label="Bonus type">
        {#each BONUS_TYPES as t (t)}<option value={t}>{t}</option>{/each}
      </select>
      <input class="flex-1" bind:value={b.source} placeholder="Source (e.g. Toughness)" aria-label="Source" />
      <button type="button" class="icon-btn text-accent print:hidden" aria-label="Remove bonus" onclick={() => remove(b.id)}>✕</button>
    </div>
  {/each}
</div>
