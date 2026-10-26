<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { uid } from '../../lib/model/id';
  import { ABILITIES, type SpellEntry, type Spellcasting } from '../../lib/model/types';
  import { SPELL_TABLES, spellRanges } from '../../lib/rules/spellTables';
  import { app } from '../../lib/state.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import UsesTracker from '../../lib/ui/UsesTracker.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';
  import { fmt } from '../../lib/ui/format';

  interface Props {
    block: Spellcasting;
    onremove: () => void;
  }
  let { block: b, onremove }: Props = $props();

  const c = $derived(app.char);
  const d = $derived(app.d.spellcasting[b.id]);
  const ranges = $derived(spellRanges(d?.casterLevel ?? 0));
  let showAll = $state(false);
  const ORD = ['0', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

  const DETAIL_PRESETS: Record<string, string[]> = {
    cleric: ['Domain', 'Domain'],
    wizard: ['School', 'Opposition school', 'Opposition school', 'Arcane bond'],
    sorcerer: ['Bloodline'],
    bloodrager: ['Bloodline'],
    oracle: ['Mystery', 'Curse'],
    witch: ['Patron', 'Familiar'],
    druid: ['Nature bond'],
    shaman: ['Spirit'],
    inquisitor: ['Domain / Inquisition'],
    summoner: ['Eidolon'],
    paladin: ['Divine bond'],
    magus: ['Arcane pool'],
  };
  const presetId = $derived(c.classes.find((k) => k.id === b.classId)?.presetId ?? '');
  const levels = $derived(
    ORD.map((_, lvl) => lvl).filter(
      (lvl) => showAll || d?.slots[lvl] != null || d?.known[lvl] != null || b.spells.some((s) => s.level === lvl),
    ),
  );

  // Offer the class's usual details (domains, school...) until any detail exists.
  const suggested = $derived(b.details.length ? ['Detail'] : (DETAIL_PRESETS[presetId] ?? ['Detail']));
  function addDetails() {
    for (const label of suggested) b.details.push({ id: uid(), label, value: '' });
  }

  function setBase(lvl: number, raw: string) {
    const v = raw.trim();
    b.slots[lvl] = v === '' || v === '-' || !Number.isFinite(Number(v)) ? null : Number(v);
  }

  function setKnown(lvl: number, raw: string) {
    const v = raw.trim();
    b.known[lvl] = v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
  }

  const spellsAt = (lvl: number) => b.spells.filter((s) => s.level === lvl);
  const removeSpell = (s: SpellEntry) => b.spells.splice(b.spells.indexOf(s), 1);
</script>

<div class="flex flex-col gap-2 rounded-sm border border-ink/30 p-2">
  <div class="flex flex-wrap items-end gap-2">
    <Field label="Class" class="w-36">
      <select class="font-semibold" bind:value={b.classId}>
        <option value={null}>— (other)</option>
        {#each c.classes as k (k.id)}<option value={k.id}>{k.name || 'Unnamed'}</option>{/each}
      </select>
    </Field>
    {#if !b.classId}<Field label="Label" class="w-32"><input bind:value={b.label} placeholder="e.g. Racial SLAs" /></Field>{/if}
    <Field label="Casting" class="w-28">
      <select bind:value={b.kind}><option value="prepared">Prepared</option><option value="spontaneous">Spontaneous</option></select>
    </Field>
    <Field label="Ability" class="w-16">
      <select bind:value={b.ability}>{#each ABILITIES as a (a)}<option value={a}>{a.toUpperCase()}</option>{/each}</select>
    </Field>
    <Field label="Spell table" class="w-44 print:hidden">
      <select bind:value={b.table}>
        <option value="">Manual</option>
        {#each SPELL_TABLES as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
      </select>
    </Field>
    <div class="stat" title="Class level + misc + caster level bonuses">
      <div class="stat-value">{d?.casterLevel ?? 0}</div>
      <div class="field-label">Caster lvl</div>
    </div>
    <Field label="CL misc" class="w-12"><NumInput bind:value={b.casterLevelMisc} signed /></Field>
    <div class="stat">
      <div class="stat-value">{fmt(d?.concentration ?? 0)}</div>
      <div class="field-label">Concentration</div>
    </div>
    <div class="text-xs leading-tight">
      <div><span class="field-label">Close</span> {ranges.close} ft</div>
      <div><span class="field-label">Medium</span> {ranges.medium} ft</div>
      <div><span class="field-label">Long</span> {ranges.long} ft</div>
    </div>
    <div class="ml-auto flex gap-1 print:hidden">
      <button
        type="button"
        class="btn"
        title="Reset slots and spells used"
        onclick={() => {
          b.slotsUsed = b.slotsUsed.map(() => 0);
          b.spells.forEach((s) => (s.used = 0));
        }}>Rest</button
      >
      <button type="button" class="btn text-accent" onclick={onremove}>Remove</button>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-1">
    {#each b.details as det, i (det.id)}
      <span class="chip">
        <input class="min-w-12 border-0 p-0 text-xs font-semibold uppercase [field-sizing:content]" bind:value={det.label} aria-label="Detail label" />
        <input class="min-w-24 border-0 p-0 [field-sizing:content]" bind:value={det.value} aria-label="{det.label} value" />
        <button type="button" class="print:hidden" aria-label="Remove {det.label}" onclick={() => b.details.splice(i, 1)}>×</button>
      </span>
    {/each}
    <button type="button" class="add-btn print:hidden" onclick={addDetails}>+ {suggested.join(', ')}</button>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr>
          <th>Level</th>
          <th class="text-center">DC</th>
          <th class="text-center">Known</th>
          <th class="text-center" title="Base + ability bonus + misc">Per day</th>
          <th class="text-center print:hidden">Base</th>
          <th class="text-center print:hidden">Misc</th>
          <th>{b.kind === 'prepared' ? 'Prepared' : 'Used'}</th>
        </tr>
      </thead>
      <tbody>
        {#each levels as lvl (lvl)}
          {@const total = d?.slots[lvl]}
          <tr class="border-b border-ink/10">
            <th class="w-12 font-display text-sm opacity-100">{ORD[lvl]}</th>
            <td class="w-12 text-center font-bold">{d?.dcs[lvl]}</td>
            <td class="w-14">
              {#if b.table && d?.known[lvl] != null && b.known.every((k) => k === null)}
                <div class="text-center">{d.known[lvl]}</div>
              {:else}
                <input class="num" value={b.known[lvl] ?? d?.known[lvl] ?? ''} placeholder="—" onchange={(e) => setKnown(lvl, e.currentTarget.value)} aria-label="Spells known level {lvl}" />
              {/if}
            </td>
            <td class="w-16 text-center font-bold" title={total == null ? 'Not castable' : `${d?.base[lvl]} base + ${d?.bonus[lvl]} ability + ${(total ?? 0) - (d?.base[lvl] ?? 0) - (d?.bonus[lvl] ?? 0)} misc`}>
              {b.kind === 'spontaneous' && lvl === 0 && total == null ? '∞' : (total ?? '—')}
            </td>
            <td class="w-14 print:hidden">
              {#if b.table}
                <div class="text-center opacity-60">{d?.base[lvl] ?? '—'}</div>
              {:else}
                <input class="num" value={b.slots[lvl] ?? ''} placeholder="—" onchange={(e) => setBase(lvl, e.currentTarget.value)} aria-label="Base slots level {lvl}" />
              {/if}
            </td>
            <td class="w-12 print:hidden"><NumInput bind:value={b.slotsMisc[lvl]} signed aria-label="Misc slots level {lvl}" /></td>
            <td>
              {#if b.kind === 'prepared'}
                <span class:text-accent={total != null && (d?.prepared[lvl] ?? 0) > total}>{d?.prepared[lvl] ?? 0}{total != null ? ` / ${total}` : ''}</span>
              {:else if total != null && total > 0}
                <UsesTracker max={total} bind:used={b.slotsUsed[lvl]} label="Level {lvl} slot" />
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <button type="button" class="text-xs underline opacity-70 print:hidden" onclick={() => (showAll = !showAll)}>
      {showAll ? 'Hide uncastable levels' : 'Show all spell levels'}
    </button>
  </div>

  {#each levels as lvl (lvl)}
    <div class="subhead mt-1 flex items-baseline gap-2">
      <span>{lvl === 0 ? 'Level 0' : `${ORD[lvl]} level`}</span>
      <span class="font-sans text-[0.65rem] font-normal tracking-normal normal-case opacity-70">DC {d?.dcs[lvl]}{d?.slots[lvl] != null ? ` · ${d.slots[lvl]}/day` : ''}</span>
    </div>
    <DynamicTable
      items={spellsAt(lvl)}
      cols={b.kind === 'prepared' ? 9 : 7}
      reorder={false}
      onremove={removeSpell}
      onadd={() => b.spells.push(make.spell(lvl))}
      addLabel="{ORD[lvl]}-level spell"
      empty="No spells."
    >
      {#snippet head()}
        {#if b.kind === 'prepared'}
          <th class="text-center" title="Times prepared">Prep</th>
          <th>Used</th>
        {/if}
        <th>Spell</th>
        <th>School</th>
        <th>Duration</th>
        <th>Range</th>
        <th>Save</th>
        <th>SR</th>
        <th>Notes</th>
      {/snippet}
      {#snippet row(s)}
        {#if b.kind === 'prepared'}
          <td class="w-10"><NumInput bind:value={s.prepared} aria-label="Times prepared" /></td>
          <td class="w-16">{#if s.prepared > 0}<UsesTracker max={s.prepared} bind:used={s.used} label="{s.name} cast" />{/if}</td>
        {/if}
        <td class="min-w-36"><input class="font-semibold" bind:value={s.name} aria-label="Spell name" /></td>
        <td class="w-24"><input bind:value={s.school} aria-label="School" /></td>
        <td class="w-24"><input bind:value={s.duration} aria-label="Duration" /></td>
        <td class="w-20"><input bind:value={s.range} aria-label="Range" /></td>
        <td class="w-20"><input bind:value={s.save} aria-label="Save" /></td>
        <td class="w-10"><input bind:value={s.sr} aria-label="Spell resistance" /></td>
        <td><input bind:value={s.notes} aria-label="Notes" /></td>
      {/snippet}
    </DynamicTable>
  {/each}
</div>
