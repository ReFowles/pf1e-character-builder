<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { uid } from '../../lib/model/id';
  import { BONUS_TYPES, type Macro } from '../../lib/model/types';
  import { tryEvaluate } from '../../lib/rules/expr';
  import { BONUS_KEYS, FORMULA_REFS, KEY_LABELS, diceTargetLabel, diceTargets } from '../../lib/rules/keys';
  import { macroSlug } from '../../lib/rules/derive';
  import { MACRO_LIBRARY } from '../../lib/rules/macroLibrary';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
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
      damageDice: (lib.damageDice ?? []).map((x) => ({ ...x, id: uid() })),
    });
  }

  function addCustom() {
    const m = { ...make.macro(), name: 'New macro', effects: [make.macroEffect()] };
    c.macros.push(m);
    open[m.id] = true;
  }

  const targets = $derived(diceTargets(c.weapons, c.skills));

  function summary(m: Macro) {
    return [
      ...m.effects.map((e) => {
        const v = Math.trunc(tryEvaluate(e.value, app.d.vars, NaN));
        if (e.key === 'concealment') return `${Number.isNaN(v) ? '?' : v}% miss chance`;
        const label = KEY_LABELS[e.key] ?? e.key;
        return `${label} ${Number.isNaN(v) ? '?' : fmt(v)}${e.type !== 'untyped' ? ` ${e.type}` : ''}`;
      }),
      ...m.damageDice.map((x) => {
        const n = Math.trunc(tryEvaluate(x.count, app.d.vars, NaN));
        const flat = x.bonus.trim() ? Math.trunc(tryEvaluate(x.bonus, app.d.vars, NaN)) : 0;
        const dice = n === 0 ? '' : `${Number.isNaN(n) ? '?' : n}d${x.sides}`;
        const extra = Number.isNaN(flat) ? '+?' : flat ? fmt(flat) : '';
        const group = targets.find((t) => t.value === x.applies)?.group;
        const where = group === 'Damage' && !x.applies.startsWith('weapon:') ? `${diceTargetLabel(x.applies, c.weapons, c.skills)} damage` : diceTargetLabel(x.applies, c.weapons, c.skills);
        const text = dice ? `+${dice}${extra}` : extra || '+0';
        return `${where} ${text}${x.type ? ` ${x.type}` : ''}`;
      }),
    ].join(', ');
  }
</script>

<Section id="macros" editable>
  {#snippet info()}
    <p>Toggle a macro to apply its effects everywhere they matter. Effects follow normal bonus stacking: same-typed bonuses don't stack except dodge, circumstance and untyped.</p>
    <p>Values can be formulas using @level, @bab, @cl, @str.mod (and other abilities) or @class.&lt;name&gt;.level.</p>
    <p><strong>Extra dice</strong> roll along with weapon damage (never multiplied on a critical), attack rolls, saves or skill checks: pick what they apply to under "To". A flat bonus can ride along with them.</p>
    <p>One macro can build on another's dice: <code>@macro.&lt;name&gt;.dice</code> is the number of dice that macro adds while it's on (0 while off), e.g. <code>@macro.sneak-attack.dice</code>. For +1 damage per sneak attack die, add extra dice with 0 dice and a bonus of <code>@macro.sneak-attack.dice</code>.</p>
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
            <div class="flex flex-wrap gap-1">
              <input class="w-32" list="bonus-keys" bind:value={e.key} placeholder="key" aria-label="Applies to" title={KEY_LABELS[e.key] ?? 'Unknown key'} class:text-accent={!KEY_LABELS[e.key]} />
              <input class="min-w-40 flex-1 font-mono text-xs" bind:value={e.value} aria-label="Value or formula" class:text-accent={!!app.d.macroErrors[e.id]} title="Number or formula. Refs: {FORMULA_REFS.join(' ')}" />
              <Select class="w-24" bind:value={e.type} options={opts(BONUS_TYPES)} aria-label="Bonus type" />
              <button type="button" class="icon-btn text-accent" aria-label="Remove effect" onclick={() => m.effects.splice(i, 1)}>✕</button>
            </div>
          {/each}
          {#each m.damageDice as x, i (x.id)}
            <!-- Dice count gets its own line: formulas like ceil(@class.rogue.level / 2) need the room. -->
            <div class="flex flex-col gap-1 rounded-sm border border-ink/10 p-1">
              <div class="flex items-center gap-1">
                <input class="min-w-0 flex-1 font-mono text-xs" bind:value={x.count} aria-label="Number of dice" class:text-accent={!!app.d.macroErrors[x.id]} title="Number of dice: a number or formula (0 for a flat bonus only). Refs: {FORMULA_REFS.join(' ')}" />
                <span>d</span>
                <NumInput class="w-12" bind:value={x.sides} aria-label="Die sides" />
                <button type="button" class="icon-btn text-accent" aria-label="Remove extra dice" onclick={() => m.damageDice.splice(i, 1)}>✕</button>
              </div>
              <div class="flex flex-wrap items-center gap-1">
                <input class="w-24 font-mono text-xs" bind:value={x.bonus} placeholder="+ bonus" aria-label="Flat bonus" class:text-accent={!!app.d.macroErrors[x.id]} title="Flat amount added to these dice: a number or formula, e.g. @macro.sneak-attack.dice. Never multiplied on a critical." />
                <input class="w-24" bind:value={x.type} placeholder="precision" aria-label="Damage type or label" title="Damage type or label shown in the roll log" />
                <span class="text-xs opacity-60">to</span>
                <Select class="min-w-32 flex-1" bind:value={x.applies} options={targets} aria-label="Applies to" title="What rolls these dice: weapon damage, attack rolls, saves or skill checks" />
              </div>
            </div>
          {/each}
          <div class="flex gap-3">
            <button type="button" class="text-xs underline opacity-70" onclick={() => m.effects.push(make.macroEffect())}>+ effect</button>
            <button type="button" class="text-xs underline opacity-70" title="Dice added to weapon damage (never multiplied on a critical), attack rolls, saves or skill checks" onclick={() => m.damageDice.push(make.macroDice())}>+ extra dice</button>
          </div>
          {#if m.damageDice.length}<p class="text-[0.65rem] opacity-60">Other macros can use this one's dice count as <code>@macro.{macroSlug(m) || 'name'}.dice</code>.</p>{/if}
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
