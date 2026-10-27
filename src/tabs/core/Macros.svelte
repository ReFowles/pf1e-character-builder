<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { uid } from '../../lib/model/id';
  import { BONUS_TYPES, type Macro } from '../../lib/model/types';
  import { tryEvaluate } from '../../lib/rules/expr';
  import { BONUS_KEYS, FORMULA_REFS, KEY_LABELS } from '../../lib/rules/keys';
  import { MACRO_LIBRARY } from '../../lib/rules/macroLibrary';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import DynamicList from '../../lib/ui/DynamicList.svelte';
  import { fmt } from '../../lib/ui/format';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';

  const c = $derived(app.char);
  let open = $state<Record<string, boolean>>({});

  function addFromLibrary(id: string) {
    const lib = MACRO_LIBRARY.find((x) => x.id === id);
    if (!lib) return;
    c.macros.push({
      ...make.macro(),
      name: lib.name,
      category: lib.category,
      libraryId: lib.id,
      notes: lib.notes,
      effects: lib.effects.map((e) => ({ ...e, id: uid() })),
    });
  }

  function addCustom() {
    const m = { ...make.macro(), name: 'New macro', effects: [make.macroEffect()] };
    c.macros.push(m);
    open[m.id] = true;
  }

  function summary(m: Macro) {
    return m.effects
      .map((e) => {
        const v = Math.trunc(tryEvaluate(e.value, app.d.vars, NaN));
        const label = KEY_LABELS[e.key] ?? e.key;
        return `${label} ${Number.isNaN(v) ? '?' : fmt(v)}${e.type !== 'untyped' ? ` ${e.type}` : ''}`;
      })
      .join(', ');
  }
</script>

<Section id="macros" editable>
  {#snippet info()}
    <p>Toggle a macro to apply its effects everywhere they matter. Effects follow normal bonus stacking: same-typed bonuses don't stack except dodge, circumstance and untyped.</p>
    <p>Values can be formulas using @level, @bab, @cl, @str.mod (and other abilities) or @class.&lt;name&gt;.level.</p>
    {#each c.macros.filter((m) => m.active) as m (m.id)}<p><strong>{m.name}</strong>: {summary(m)}</p>{/each}
  {/snippet}

  <EditMode>
  {#snippet children(sectionEditing)}
  <datalist id="bonus-keys">
    {#each BONUS_KEYS as k (k.key)}<option value={k.key}>{k.label}</option>{/each}
  </datalist>

  <DynamicList bind:items={c.macros} empty="Toggle situational bonuses like Power Attack, Flanking or Heroism. Add one from the library." class="grid grid-cols-1 gap-1 sm:grid-cols-2">
    {#snippet item(m)}
      <div class="flex items-start gap-2">
        <label class="mt-0.5 inline-flex cursor-pointer items-center">
          <input type="checkbox" class="peer sr-only" bind:checked={m.active} aria-label="Activate {m.name}" />
          <span class="h-5 w-9 rounded-full bg-ink/20 transition peer-checked:bg-accent after:block after:size-4 after:translate-x-0.5 after:translate-y-0.5 after:rounded-full after:bg-paper after:transition peer-checked:after:translate-x-4.5"></span>
        </label>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1">
            <span class="font-semibold" class:opacity-60={!m.active}>{m.name || 'Unnamed'}</span>
            <span class="text-[0.6rem] uppercase opacity-50">{m.category}</span>
            {#if sectionEditing}
              <button type="button" class="ml-auto text-xs underline opacity-70 print:hidden" onclick={() => (open[m.id] = !open[m.id])}>
                {open[m.id] ? 'Done' : 'Configure'}
              </button>
            {/if}
          </div>
          <div class="text-xs opacity-80">{summary(m)}</div>
          {#if m.notes && !open[m.id]}<div class="text-xs italic opacity-60">{m.notes}</div>{/if}
        </div>
      </div>
      {#if open[m.id] && sectionEditing}
        <div class="mt-1 flex flex-col gap-1 border-t border-ink/10 pt-1 text-sm print:hidden">
          <div class="grid grid-cols-[2fr_1fr] gap-2">
            <Field label="Name"><input bind:value={m.name} /></Field>
            <Field label="Category">
              <Select bind:value={m.category} options={opts(['feat', 'class', 'spell', 'item', 'condition', 'custom'] as const)} />
            </Field>
          </div>
          {#each m.effects as e, i (e.id)}
            <div class="flex gap-1">
              <input class="w-32" list="bonus-keys" bind:value={e.key} placeholder="key" aria-label="Applies to" title={KEY_LABELS[e.key] ?? 'Unknown key'} class:text-accent={!KEY_LABELS[e.key]} />
              <input class="flex-1 font-mono text-xs" bind:value={e.value} aria-label="Value or formula" class:text-accent={!!app.d.macroErrors[e.id]} title="Number or formula. Refs: {FORMULA_REFS.join(' ')}" />
              <Select class="w-24" bind:value={e.type} options={opts(BONUS_TYPES)} aria-label="Bonus type" />
              <button type="button" class="icon-btn text-accent" aria-label="Remove effect" onclick={() => m.effects.splice(i, 1)}>✕</button>
            </div>
          {/each}
          <button type="button" class="self-start text-xs underline opacity-70" onclick={() => m.effects.push(make.macroEffect())}>+ effect</button>
          <Field label="Notes"><input bind:value={m.notes} /></Field>
        </div>
      {/if}
    {/snippet}
    {#snippet tools()}
      <Select
        class="w-44 text-sm"
        aria-label="Add macro from library"
        value=""
        placeholder="+ From library…"
        options={['feat', 'class', 'spell', 'condition'].flatMap((cat) =>
          MACRO_LIBRARY.filter((x) => x.category === cat).map((x) => ({ value: x.id, label: x.name, group: cat })),
        )}
        onchange={(id) => addFromLibrary(id)}
      />
      <button type="button" class="add-btn" onclick={addCustom}>+ Custom</button>
    {/snippet}
  </DynamicList>
  {/snippet}
  </EditMode>
</Section>
