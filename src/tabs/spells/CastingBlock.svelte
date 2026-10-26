<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { uid } from '../../lib/model/id';
  import { ABILITIES, type SpellEntry, type Spellcasting } from '../../lib/model/types';
  import { SPELL_TABLES, spellRanges } from '../../lib/rules/spellTables';
  import { CONCENTRATION_DCS } from '../../lib/rules/concentration';
  import { slug } from '../../lib/rules/derive';
  import type { DbSpell } from '../../lib/db/types';
  import { app } from '../../lib/state.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import UsesTracker from '../../lib/ui/UsesTracker.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';
  import DbPicker from '../../lib/ui/DbPicker.svelte';
  import { useSection } from '../../lib/ui/sectionContext';
  import { fmt } from '../../lib/ui/format';

  interface Props {
    block: Spellcasting;
    onremove: () => void;
  }
  let { block: b, onremove }: Props = $props();

  const section = useSection();
  const c = $derived(app.char);
  const d = $derived(app.d.spellcasting[b.id]);
  const ranges = $derived(spellRanges(d?.casterLevel ?? 0));
  const manual = $derived(!b.table);
  let showAll = $state(false);
  const ORD = ['0', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
  const conId = $derived(`concentration-${b.id}`);

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
    'unchained-summoner': ['Eidolon'],
    paladin: ['Divine bond'],
    magus: ['Arcane pool'],
  };
  const presetId = $derived(c.classes.find((k) => k.id === b.classId)?.presetId ?? '');
  const castable = (lvl: number) => d?.slots[lvl] != null || d?.known[lvl] != null || b.spells.some((s) => s.level === lvl);
  // Manual blocks always show every level so slots can be entered anywhere.
  const levels = $derived(ORD.map((_, lvl) => lvl).filter((lvl) => manual || showAll || castable(lvl)));
  const castableLevels = $derived(ORD.map((_, lvl) => lvl).filter((lvl) => d?.slots[lvl] != null));

  // Offer the class's usual details (domains, school...) until any detail exists.
  const suggested = $derived(b.details.length ? ['Detail'] : (DETAIL_PRESETS[presetId] ?? ['Detail']));
  function addDetails() {
    for (const label of suggested) b.details.push({ id: uid(), label, value: '' });
  }

  const parseSlot = (raw: string) => {
    const v = raw.trim();
    return v === '' || v === '-' || !Number.isFinite(Number(v)) ? null : Number(v);
  };

  const spellsAt = (lvl: number, domain = false) => b.spells.filter((s) => s.level === lvl && !!s.domain === domain);

  // Spell lists are keyed by class (wizard, sorcerer...). Unchained presets map to their list.
  const classKey = $derived.by(() => {
    const k = c.classes.find((x) => x.id === b.classId);
    if (!k) return '';
    if (k.presetId === 'unchained-summoner' || (/summoner/i.test(k.name) && /unchained/i.test(k.name))) return 'summonerUnchained';
    return (k.presetId ?? slug(k.name)).replace(/^unchained-/, '');
  });
  const className = $derived(c.classes.find((x) => x.id === b.classId)?.name ?? '');

  function addFromDb(sp: DbSpell, fallbackLevel: number, domain = false) {
    const level = domain ? fallbackLevel : (sp.levels[classKey] ?? fallbackLevel);
    b.spells.push({
      ...make.spell(level),
      domain,
      name: sp.name,
      school: sp.school,
      duration: sp.duration,
      range: sp.range,
      save: sp.save,
      sr: sp.sr,
      notes: sp.summary,
    });
  }
  const removeSpell = (s: SpellEntry) => b.spells.splice(b.spells.indexOf(s), 1);
</script>

{#snippet spellTable(lvl: number, domain: boolean)}
  {@const prepared = b.kind === 'prepared'}
  {@const tracksUses = prepared && lvl > 0}
  <DynamicTable
    items={spellsAt(lvl, domain)}
    cols={(prepared ? 1 : 0) + (tracksUses ? 1 : 0) + 7}
    reorder={false}
    onremove={removeSpell}
    onadd={() => b.spells.push({ ...make.spell(lvl), domain })}
    addLabel={domain ? 'Domain spell' : `${ORD[lvl]}-level spell`}
    empty={domain ? 'No domain spell.' : 'No spells.'}
  >
    {#snippet head()}
      {#if prepared}<th class="text-center" title="Times prepared">Prep</th>{/if}
      {#if tracksUses}<th>Used</th>{/if}
      <th>Spell</th>
      <th>School</th>
      <th>Duration</th>
      <th>Range</th>
      <th>Save</th>
      <th>SR</th>
      <th>Notes</th>
    {/snippet}
    {#snippet row(s)}
      {#if prepared}<td data-label="Prep" class="w-11 align-middle"><NumInput bind:value={s.prepared} aria-label="Times prepared" /></td>{/if}
      {#if tracksUses}
        <td data-label="Used" class="w-16 pl-1 align-middle">{#if s.prepared > 0}<UsesTracker max={s.prepared} bind:used={s.used} label="{s.name} cast" />{/if}</td>
      {/if}
      <td data-label="Spell" class="w-36 align-middle"><input class="w-full font-semibold" bind:value={s.name} aria-label="Spell name" /></td>
      <td data-label="School" class="w-24 align-middle"><input class="w-full" bind:value={s.school} aria-label="School" /></td>
      <td data-label="Duration" class="w-28 align-middle"><input class="w-full" bind:value={s.duration} aria-label="Duration" /></td>
      <td data-label="Range" class="w-20 align-middle"><input class="w-full" bind:value={s.range} aria-label="Range" /></td>
      <td data-label="Save" class="w-24 align-middle"><input class="w-full" bind:value={s.save} aria-label="Save" /></td>
      <td data-label="SR" class="w-12 align-middle"><input class="w-full" bind:value={s.sr} aria-label="Spell resistance" /></td>
      <td data-label="Notes" class="min-w-56 align-middle"><textarea rows="1" class="w-full" bind:value={s.notes} aria-label="Notes"></textarea></td>
    {/snippet}
    {#snippet tools()}
      <DbPicker
        kind="spells"
        label={domain ? `Find ${ORD[lvl]}-level domain spell` : `Find ${ORD[lvl]}-level ${className} spell`}
        filter={domain ? (sp) => Object.values(sp.levels).includes(lvl) : classKey ? (sp) => sp.levels[classKey] === lvl : undefined}
        onpick={(sp) => addFromDb(sp, lvl, domain)}
      >
        {#snippet detail(sp)}{sp.school}{sp.summary ? ` — ${sp.summary}` : ''}{/snippet}
      </DbPicker>
    {/snippet}
  </DynamicTable>
{/snippet}

<div class="flex flex-col gap-2 rounded-sm border border-ink/30 p-2">
  <div class="flex flex-wrap items-end gap-2">
    <Field label="Class" class="w-36">
      <select class="font-semibold" bind:value={b.classId}>
        <option value={null}>Other</option>
        {#each c.classes as k (k.id)}<option value={k.id}>{k.name || 'Unnamed'}</option>{/each}
      </select>
    </Field>
    {#if !b.classId}<Field label="Label" class="w-32"><input bind:value={b.label} placeholder="e.g. Racial SLAs" /></Field>{/if}
    <Field label="Casting" class="w-32">
      <select bind:value={b.kind}><option value="prepared">Prepared</option><option value="spontaneous">Spontaneous</option></select>
    </Field>
    <Field label="Ability" class="w-20">
      <select bind:value={b.ability}>{#each ABILITIES as a (a)}<option value={a}>{a.toUpperCase()}</option>{/each}</select>
    </Field>
    <Field label="Spell table" class="w-48 print:hidden">
      <select bind:value={b.table}>
        <option value="">Manual</option>
        {#each SPELL_TABLES as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
      </select>
    </Field>
    <label class="inline-flex h-7 items-center gap-1 self-end text-xs print:hidden" title="One extra domain spell slot per spell level (clerics)">
      <input type="checkbox" bind:checked={b.domainSlot} /> Domain slot
    </label>
    <div class="stat" title="Class level + misc + caster level bonuses">
      <div class="stat-value">{d?.casterLevel ?? 0}</div>
      <div class="field-label">Caster lvl</div>
    </div>
    <Field label={b.classId ? 'CL misc' : 'Caster level'} class="w-16"><NumInput bind:value={b.casterLevelMisc} signed={!!b.classId} /></Field>
    <div class="stat relative" title={CONCENTRATION_DCS.map((r) => `${r.situation}: DC ${r.dc(1)} (1st level)`).join('\n')}>
      <div class="stat-value">{fmt(d?.concentration ?? 0)}</div>
      <div class="field-label">
        Concentration
        <button type="button" class="ml-0.5 rounded-full border border-current px-1 font-serif text-[0.55rem] italic normal-case print:hidden" popovertarget={conId} aria-label="Concentration DCs">i</button>
      </div>
    </div>
    <div class="stat" title="Caster level + misc + spell penetration bonuses, vs spell resistance">
      <div class="stat-value">{fmt(d?.spellPen ?? 0)}</div>
      <div class="field-label">Spell pen.</div>
    </div>
    <Field label="Pen. misc" class="w-14"><NumInput bind:value={b.spellPenMisc} signed /></Field>
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
      {#if section.editing}<button type="button" class="btn text-accent" onclick={onremove}>Remove</button>{/if}
    </div>
  </div>

  <div id={conId} popover class="info-popover">
    <div class="mb-2 flex items-center justify-between gap-4">
      <h3 class="font-display text-sm font-bold tracking-widest uppercase">Concentration DCs</h3>
      <button type="button" class="icon-btn" popovertarget={conId} popovertargetaction="hide" aria-label="Close">✕</button>
    </div>
    <p class="mb-2 text-sm">Roll d20 {fmt(d?.concentration ?? 0)} (caster level + {b.ability.toUpperCase()} modifier + bonuses).</p>
    <table class="w-full text-sm">
      <thead>
        <tr><th>Situation</th>{#each castableLevels.filter((l) => l > 0) as l (l)}<th class="text-center">{ORD[l]}</th>{/each}</tr>
      </thead>
      <tbody>
        {#each CONCENTRATION_DCS as r (r.situation)}
          <tr class="border-b border-ink/10">
            <td>{r.situation}</td>
            {#each castableLevels.filter((l) => l > 0) as l (l)}<td class="text-center text-xs whitespace-nowrap">{r.dc(l)}</td>{/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="flex flex-wrap items-center gap-1">
    {#each b.details as det, i (det.id)}
      {#if section.editing}
        <span class="chip">
          <input class="chip-input text-xs font-semibold uppercase" bind:value={det.label} aria-label="Detail label" />
          <input class="chip-input" bind:value={det.value} placeholder="value" aria-label="{det.label} value" />
          <button type="button" class="print:hidden" aria-label="Remove {det.label}" onclick={() => b.details.splice(i, 1)}>×</button>
        </span>
      {:else}
        <span class="chip"><span class="text-[0.65rem] font-semibold uppercase opacity-70">{det.label}</span>{det.value}</span>
      {/if}
    {/each}
    {#if section.editing}
      <button type="button" class="add-btn self-center print:hidden" onclick={addDetails}>+ {suggested.join(', ')}</button>
    {/if}
  </div>

  <table class="dyn-table keep-table text-sm">
    <thead>
      <tr>
        <th>Level</th>
        <th class="text-center">DC</th>
        <th class="text-center">Known</th>
        <th class="text-center" title="Base + ability bonus + misc; cantrips are unlimited">Per day</th>
        {#if b.domainSlot}<th class="text-center">Domain</th>{/if}
        <th class="text-center print:hidden">Base</th>
        <th class="text-center print:hidden">Misc</th>
        <th class="text-center">{b.kind === 'prepared' ? 'Prepared' : 'Used'}</th>
      </tr>
    </thead>
    <tbody>
      {#each levels as lvl (lvl)}
        {@const total = d?.slots[lvl]}
        <tr>
          <th class="w-12 align-middle font-display text-sm opacity-100">{ORD[lvl]}</th>
          <td class="w-12 text-center align-middle font-bold">{d?.dcs[lvl]}</td>
          <td class="w-14 align-middle">
            {#if b.table && d?.known[lvl] != null && b.known.every((k) => k === null)}
              <div class="text-center">{d.known[lvl]}</div>
            {:else}
              <input class="num" value={b.known[lvl] ?? d?.known[lvl] ?? ''} placeholder="—" onchange={(e) => (b.known[lvl] = parseSlot(e.currentTarget.value))} aria-label="Spells known level {lvl}" />
            {/if}
          </td>
          <td
            class="w-16 text-center align-middle font-bold"
            title={lvl === 0 ? 'Cantrips and orisons can be cast any number of times' : total == null ? 'Not castable' : `${d?.base[lvl]} base + ${d?.bonus[lvl]} ability + ${(total ?? 0) - (d?.base[lvl] ?? 0) - (d?.bonus[lvl] ?? 0)} misc`}
          >
            {lvl === 0 && (total != null || d?.known[0] != null) ? '∞' : (total ?? '—')}
          </td>
          {#if b.domainSlot}<td class="w-16 text-center align-middle">{d?.domain[lvl] ? `+${d.domain[lvl]}` : ''}</td>{/if}
          <td class="w-14 align-middle print:hidden">
            {#if b.table}
              <div class="text-center opacity-60">{d?.base[lvl] ?? '—'}</div>
            {:else}
              <input class="num" value={b.slots[lvl] ?? ''} placeholder="—" onchange={(e) => (b.slots[lvl] = parseSlot(e.currentTarget.value))} aria-label="Base slots level {lvl}" />
            {/if}
          </td>
          <td class="w-14 align-middle print:hidden"><NumInput bind:value={b.slotsMisc[lvl]} signed aria-label="Misc slots level {lvl}" /></td>
          <td class="pl-2 text-center align-middle">
            {#if b.kind === 'prepared'}
              <span class:text-accent={total != null && (d?.prepared[lvl] ?? 0) > total}>{d?.prepared[lvl] ?? 0}{total != null ? ` / ${total}` : ''}</span>
              {#if d?.domain[lvl]}<span class="ml-1 text-xs opacity-70" title="Domain slot">+{d.domainPrepared[lvl]}/{d.domain[lvl]}</span>{/if}
            {:else if lvl > 0 && total != null && total > 0}
              <div class="flex justify-center"><UsesTracker max={total} bind:used={b.slotsUsed[lvl]} label="Level {lvl} slot" /></div>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if !manual}
    <button type="button" class="self-start text-xs underline opacity-70 hover:opacity-100 print:hidden" onclick={() => (showAll = !showAll)}>
      {showAll ? 'Hide uncastable levels' : 'Show all spell levels'}
    </button>
  {/if}

  {#each levels.filter((lvl) => manual ? castable(lvl) : true) as lvl (lvl)}
    <div class="flex break-inside-avoid flex-col gap-1 rounded-sm border border-ink/25 p-2">
      <div class="subhead flex items-baseline gap-2">
        <span>{lvl === 0 ? 'Level 0' : `${ORD[lvl]} level`}</span>
        <span class="font-sans text-[0.65rem] font-normal tracking-normal normal-case opacity-70">
          DC {d?.dcs[lvl]} · {lvl === 0 ? 'at will' : d?.slots[lvl] != null ? `${d.slots[lvl]}/day` : 'not castable'}
        </span>
      </div>
      {@render spellTable(lvl, false)}
      {#if d?.domain[lvl]}
        <div class="field-label mt-1">Domain spell</div>
        {@render spellTable(lvl, true)}
      {/if}
    </div>
  {/each}
</div>
