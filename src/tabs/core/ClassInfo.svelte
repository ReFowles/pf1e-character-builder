<script lang="ts">
  import { classKnowledges, make } from '../../lib/model/defaults';
  import type { ClassDef, LevelEntry, Save } from '../../lib/model/types';
  import { CLASS_PRESETS, findPreset, presetFromDb, type ClassPreset } from '../../lib/rules/classPresets';
  import { defaultSpellAdvance, eligibleCastingClasses, prestigeLevelOf } from '../../lib/rules/prestige';
  import { loadDb } from '../../lib/db';
  import { subtypeKey } from '../../lib/rules/skills';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import Chevron from '../../lib/ui/Chevron.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';
  import Combobox from '../../lib/ui/Combobox.svelte';

  // Base and unchained presets are built in; prestige (and any extra base) classes come from the bundled database on first open.
  let dbPresets = $state<ClassPreset[]>([]);
  let dbLoading = false;
  function loadClassDb() {
    if (dbLoading || dbPresets.length) return;
    dbLoading = true;
    loadDb('classes')
      .then((rows) => (dbPresets = rows.map(presetFromDb).filter((p) => !CLASS_PRESETS.some((x) => x.id === p.id || x.name.toLowerCase() === p.name.toLowerCase()))))
      .catch(() => (dbLoading = false));
  }
  const GROUPS = ['Base', 'Unchained', 'Prestige'];
  const groupOf = (p: ClassPreset) => (p.prestige ? 'Prestige' : /unchained/i.test(p.id) ? 'Unchained' : 'Base');
  const CLASS_OPTIONS = $derived(
    [...CLASS_PRESETS, ...dbPresets]
      .map((p) => ({ value: p.name, group: groupOf(p), title: p.source }))
      .sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.value.localeCompare(b.value)),
  );

  const c = $derived(app.char);
  const d = $derived(app.d);
  const ready = $derived(d.xpNext !== null && c.xp.current >= d.xpNext);
  let showLog = $state(false);
  let newLevelClass = $state('');
  const BAB_LABEL = { full: 'full BAB', '3/4': '¾ BAB', '1/2': '½ BAB' };

  /** Add Knowledge rows for any knowledge class skills not already on the sheet. */
  function ensureKnowledgeRows(classSkills: string[]) {
    for (const sub of classKnowledges(classSkills)) {
      if (c.skills.some((s) => s.skill === 'knowledge' && subtypeKey(s.subtype) === sub)) continue;
      const blank = c.skills.find((s) => s.skill === 'knowledge' && !s.subtype?.trim() && !s.ranks);
      if (blank) {
        blank.subtype = sub;
        continue;
      }
      const last = c.skills.findLastIndex((s) => s.skill === 'knowledge');
      c.skills.splice(last + 1, 0, make.skill('knowledge', sub));
    }
  }

  function applyPreset(k: ClassDef, preset: ClassPreset) {
    Object.assign(k, {
      name: preset.name,
      presetId: preset.id,
      hd: preset.hd,
      bab: preset.bab,
      goodSaves: [...preset.goodSaves],
      skillRanks: preset.skillRanks,
      classSkills: [...preset.classSkills],
      castingAbility: preset.castingAbility,
      prestige: !!preset.prestige,
      spellType: preset.spellType,
      castingAdvance: preset.castingAdvance ? { which: preset.castingAdvance.which, levels: [...preset.castingAdvance.levels] } : undefined,
    });
    ensureKnowledgeRows(preset.classSkills);
    // Prestige levels already taken pick up the class's spellcasting advancement.
    c.levels.forEach((l, i) => {
      if (l.classId === k.id) l.spellAdvance = defaultSpellAdvance(c, k, prestigeLevelOf(c.levels, i));
    });
  }

  function onName(k: ClassDef) {
    const preset = findPreset(k.name, dbPresets);
    if (preset && preset.id !== k.presetId) applyPreset(k, preset);
  }

  /** Casting classes a level can advance, with the table's suggestion marked. */
  function advanceOptions(l: LevelEntry, i: number) {
    const k = c.classes.find((x) => x.id === l.classId);
    if (!k?.castingAdvance) return null;
    const eligible = eligibleCastingClasses(c, k.castingAdvance);
    return { eligible, byTable: k.castingAdvance.levels.includes(prestigeLevelOf(c.levels, i)), k };
  }
  const toggleAdvance = (l: LevelEntry, id: string) => (l.spellAdvance = l.spellAdvance.includes(id) ? l.spellAdvance.filter((x) => x !== id) : [...l.spellAdvance, id]);
  const hasPrestigeCasting = $derived(c.classes.some((k) => k.castingAdvance) && c.spellcasting.some((b) => b.classId));

  function addClass() {
    const k = make.classDef();
    c.classes.push(k);
    if (!c.favoredClassIds.length) c.favoredClassIds = [k.id];
    newLevelClass = k.id;
  }

  function removeClass(i: number) {
    const k = c.classes[i];
    const taken = c.levels.filter((l) => l.classId === k.id).length;
    if (taken && !confirm(`Remove ${k.name || 'this class'} and its ${taken} level(s)?`)) return;
    c.levels = c.levels.filter((l) => l.classId !== k.id);
    c.classes.splice(i, 1);
    c.favoredClassIds = c.favoredClassIds.filter((id) => id !== k.id);
  }

  function addLevel() {
    const id = newLevelClass || c.favoredClassIds[0] || c.classes[0]?.id;
    if (!id) return;
    const l = make.level(id);
    c.levels.push(l);
    const k = c.classes.find((x) => x.id === id);
    if (k) l.spellAdvance = defaultSpellAdvance(c, k, prestigeLevelOf(c.levels, c.levels.length - 1));
  }
  function onLevelClass(l: LevelEntry, i: number) {
    const k = c.classes.find((x) => x.id === l.classId);
    l.spellAdvance = k ? defaultSpellAdvance(c, k, prestigeLevelOf(c.levels, i)) : [];
  }

  function toggleSave(k: ClassDef, s: Save) {
    k.goodSaves = k.goodSaves.includes(s) ? k.goodSaves.filter((x) => x !== s) : [...k.goodSaves, s];
  }

  const className = (id: string) => c.classes.find((k) => k.id === id)?.name || '—';
  const toggleFavored = (id: string) => (c.favoredClassIds = c.favoredClassIds.includes(id) ? c.favoredClassIds.filter((x) => x !== id) : [...c.favoredClassIds, id]);

  // Named "other" FCBs already used, offered as choices on every favored level.
  const knownOther = $derived.by(() => {
    const seen = new Map<string, string>();
    for (const l of c.levels)
      if (l.fcb.kind === 'other' && l.fcb.label.trim() && !seen.has(l.fcb.label.trim())) seen.set(l.fcb.label.trim(), l.fcb.amount || '1');
    return [...seen].map(([label, amount]) => ({ label, amount }));
  });

  // A new "other" FCB is typed into a local draft and committed on blur/Enter,
  // so the character (and every dropdown built from it) doesn't change mid-typing.
  let drafts = $state<Record<string, { label: string; amount: string }>>({});

  const fcbValue = (l: LevelEntry) =>
    drafts[l.id] || (l.fcb.kind === 'other' && !l.fcb.label.trim())
      ? 'new'
      : l.fcb.kind !== 'other'
        ? l.fcb.kind
        : `other:${l.fcb.label.trim()}`;

  function commitDraft(l: LevelEntry) {
    const d = drafts[l.id];
    if (!d) return;
    if (d.label.trim()) l.fcb = { kind: 'other', label: d.label.trim(), amount: d.amount.trim() || '1' };
    delete drafts[l.id];
  }

  function setFcb(l: LevelEntry, v: string) {
    delete drafts[l.id];
    if (v === 'hp' || v === 'skill') l.fcb = { kind: v, label: '', amount: '' };
    else if (v === 'new') drafts[l.id] = { label: '', amount: '1' };
    else {
      const o = knownOther.find((x) => `other:${x.label}` === v)!;
      l.fcb = { kind: 'other', label: o.label, amount: o.amount };
    }
  }
</script>

<Section id="classes" editable>
  {#snippet info()}
    <p><strong>Level</strong> is the total of all class levels. The experience target follows the {c.xp.track === 'milestone' ? 'milestone setting, which hides experience entirely' : `${c.xp.track} track`} (change it in Settings).</p>
    <p><strong>Hit points</strong> per level are entered in Level history (Edit mode); 1st level takes the maximum when Settings say so. Each level adds at least 1 HP after Con.</p>
    <p><strong>Skill ranks</strong> per level are the class's ranks + Int modifier (minimum 1), plus +1 for each favored class skill bonus.</p>
    <p><strong>Favored class bonuses</strong> only count on levels taken in a favored class (★). Half-elves (Multitalented) and the Favored Prestige Class feat allow a second ★. Fractional "other" bonuses add up as entered and round down when used.</p>
    <p><strong>Prestige classes</strong> are in the class list under Prestige. Levels that grant "+1 level of existing spellcasting class" are ticked in Level history by the class table; tick an extra level for the Prestigious Spellcaster feat. Each tick adds one caster level (and spells per day) to that class's spells section.</p>
  {/snippet}
  <EditMode>
  {#snippet children(editing)}
  <div class="flex items-center gap-3 border-b border-ink/20 pb-2">
    <div class="stat">
      <div class="stat-value text-lg">{d.level}</div>
      <div class="field-label">Level</div>
    </div>
    {#if c.xp.track !== 'milestone'}
      <div class="flex flex-1 flex-col items-end">
        <div class="flex items-center justify-end gap-1">
          <NumInput class="w-28 text-right" bind:value={c.xp.current} aria-label="Current experience" />
          <span class="opacity-60">/</span>
          <span class="tabular-nums" title="{c.xp.track} track (change in Settings)">{d.xpNext?.toLocaleString() ?? '—'}</span>
        </div>
        <span class="field-label">
          Experience
          {#if ready}<span class="ml-1 rounded-sm bg-gold px-1 text-paper normal-case">Level up!</span>{/if}
        </span>
      </div>
    {/if}
  </div>

  <div class="overflow-x-auto">
    <table class="dyn-table keep-table">
      <thead>
        <tr>
          <th title="Favored class">FC</th>
          <th class="text-center">Lv</th>
          <th>Class</th>
          {#if editing}
            <th class="text-center">HD</th>
            <th class="text-center">BAB</th>
            <th class="text-center">Good saves</th>
            <th class="text-center" title="Skill ranks per level">Ranks</th>
            <th></th>
          {:else}
            <th colspan="4">Progression</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each c.classes as k, i (k.id)}
          {@const fav = c.favoredClassIds.includes(k.id)}
          <tr>
            <td class="w-6 text-center align-middle">
              <button
                type="button"
                class={['text-lg leading-none', fav ? 'text-gold' : 'opacity-25 hover:opacity-60 print:invisible']}
                aria-pressed={fav}
                aria-label="Favored class: {k.name || 'unnamed'}"
                title={k.prestige ? 'Favored prestige class (needs the Favored Prestige Class feat)' : 'Favored class'}
                onclick={() => toggleFavored(k.id)}>★</button
              >
            </td>
            <td class="w-8 text-center align-middle font-bold tabular-nums" title={app.d.castingLevels[k.id] !== app.d.classLevels[k.id] ? `Caster level ${app.d.castingLevels[k.id]} with prestige advancement` : undefined}>{app.d.classLevels[k.id] ?? 0}</td>
            <td>
              <div class="flex items-center gap-1">
                <Combobox class="w-full font-semibold" bind:value={k.name} options={CLASS_OPTIONS} onopen={loadClassDb} oncommit={() => onName(k)} placeholder="Class name" aria-label="Class name" />
                {#if k.prestige}<span class="rounded-sm bg-ink/10 px-1 text-[0.6rem] uppercase" title="Prestige class">PrC</span>{/if}
              </div>
            </td>
            {#if editing}
              <td>
                <Select class="w-16" bind:value={k.hd} options={opts([6, 8, 10, 12] as const, (hd) => `d${hd}`)} aria-label="Hit die" />
              </td>
              <td>
                <Select
                  class="w-16"
                  bind:value={k.bab}
                  options={[
                    { value: 'full' as const, label: 'Full' },
                    { value: '3/4' as const, label: '¾' },
                    { value: '1/2' as const, label: '½' },
                  ]}
                  aria-label="BAB progression"
                />
              </td>
              <td class="text-center whitespace-nowrap">
                {#each ['fort', 'ref', 'will'] as const as s (s)}
                  <button
                    type="button"
                    class="mx-px rounded-sm border px-1 text-xs uppercase"
                    class:bg-ink={k.goodSaves.includes(s)}
                    class:text-paper={k.goodSaves.includes(s)}
                    aria-pressed={k.goodSaves.includes(s)}
                    onclick={() => toggleSave(k, s)}>{s[0]}</button
                  >
                {/each}
              </td>
              <td class="w-12"><NumInput bind:value={k.skillRanks} aria-label="Skill ranks per level" /></td>
              <td><button type="button" class="icon-btn text-accent" aria-label="Remove class" onclick={() => removeClass(i)}>✕</button></td>
            {:else}
              <!-- Separate cells so the bullets line up across classes. -->
              <td class="progression pl-3">d{k.hd}</td>
              <td class="progression">{BAB_LABEL[k.bab]}</td>
              <td class="progression">{k.goodSaves.map((s) => s[0].toUpperCase()).join('') || '—'}</td>
              <td class="progression">{k.skillRanks}+Int</td>
            {/if}
          </tr>
        {/each}
        <tr class="print-row hidden print:table-row">{#each { length: 7 }, i (i)}<td></td>{/each}</tr>
      </tbody>
    </table>
  </div>

  <div class="flex flex-wrap items-center gap-2 print:hidden">
    {#if editing || !c.classes.length}<button type="button" class="add-btn" onclick={addClass}>+ Class</button>{/if}
    {#if c.classes.length && (editing || !c.levels.length)}
      <Select
        bind:value={() => newLevelClass || c.favoredClassIds[0] || c.classes[0]?.id, (v) => (newLevelClass = v ?? '')}
        options={c.classes.map((k) => ({ value: k.id, label: k.name || 'Unnamed class' }))}
        aria-label="Class for new level"
        class="text-sm"
      />
      <button type="button" class="btn-primary" onclick={addLevel}>+ Level</button>
      {#if editing && c.levels.length}
        <button type="button" class="btn inline-flex items-center gap-1" aria-expanded={showLog} onclick={() => (showLog = !showLog)}>
          Level history <Chevron open={showLog} />
        </button>
      {/if}
    {/if}
  </div>

  {#if editing && showLog && c.levels.length}
    <div class="overflow-x-auto print:hidden">
      <table class="dyn-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Class</th>
            <th class="text-center">HP roll</th>
            <th>Favored class bonus</th>
            {#if hasPrestigeCasting}<th title="Casting classes this level advances by one caster level">Spellcasting</th>{/if}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each c.levels as l, i (l.id)}
            <tr>
              <td data-label="#" class="align-middle tabular-nums">{i + 1}</td>
              <td data-label="Class" class="w-28">
                <Select class="w-full" bind:value={l.classId} onchange={() => onLevelClass(l, i)} options={c.classes.map((k) => ({ value: k.id, label: k.name || 'Unnamed class' }))} aria-label="Class for level {i + 1}" />
              </td>
              <td data-label="HP roll" class="w-20 text-center align-middle">
                {#if i === 0 && c.maxHpFirstLevel}
                  <span class="text-xs opacity-60" title="Max HP at 1st level (change in Settings)">max</span>
                {:else}
                  <NumInput bind:value={l.hpRoll} aria-label="HP rolled at level {i + 1}" />
                {/if}
              </td>
              <td data-label="Favored class bonus">
                {#if c.favoredClassIds.includes(l.classId)}
                  <div class="flex flex-wrap gap-1">
                    <Select
                      class="max-w-48"
                      value={fcbValue(l)}
                      onchange={(v) => setFcb(l, v)}
                      options={[
                        { value: 'hp', label: '+1 HP' },
                        { value: 'skill', label: '+1 skill rank' },
                        ...knownOther.map((o) => ({ value: `other:${o.label}`, label: `+${o.amount} ${o.label}` })),
                        { value: 'new', label: 'Other…' },
                      ]}
                      aria-label="Favored class bonus at level {i + 1}"
                    />
                    {#if drafts[l.id]}
                      <input class="w-14 text-center" bind:value={drafts[l.id].amount} placeholder="1/3" aria-label="Amount per level" title="Amount gained this level, e.g. 1/3" />
                      <input
                        class="min-w-24 flex-1"
                        bind:value={drafts[l.id].label}
                        placeholder="e.g. channel damage"
                        aria-label="Alternate favored class bonus"
                        onblur={() => commitDraft(l)}
                        onkeydown={(e) => e.key === 'Enter' && commitDraft(l)}
                      />
                    {/if}
                  </div>
                {:else}
                  <span class="text-xs opacity-50">not favored class</span>
                {/if}
              </td>
              {#if hasPrestigeCasting}
                {@const adv = advanceOptions(l, i)}
                <td data-label="Spellcasting" class="align-middle whitespace-nowrap">
                  {#if adv}
                    {#if adv.eligible.length}
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        {#each adv.eligible as k (k.id)}
                          <label class="inline-flex items-center gap-1 whitespace-nowrap">
                            <input type="checkbox" checked={l.spellAdvance.includes(k.id)} onchange={() => toggleAdvance(l, k.id)} aria-label="Level {i + 1} advances {k.name} spellcasting" />
                            {k.name}
                          </label>
                        {/each}
                        <span class="opacity-50" title={adv.byTable ? 'Advances by the class table' : l.spellAdvance.length ? 'Extra advancement (Prestigious Spellcaster)' : 'No spellcasting advancement at this level'}>{adv.byTable ? 'table' : l.spellAdvance.length ? 'feat' : '—'}</span>
                      </div>
                    {:else}
                      <span class="text-xs opacity-50">{adv.k.castingAdvance?.which === 'both' ? 'needs an arcane and a divine casting class' : 'no matching casting class'}</span>
                    {/if}
                  {/if}
                </td>
              {/if}
              <td><button type="button" class="icon-btn text-accent" aria-label="Remove level {i + 1}" onclick={() => c.levels.splice(i, 1)}>✕</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if app.d.fcb.hp || app.d.fcb.skill || app.d.fcb.other.length}
    <div class="text-sm">
      <span class="field-label">Favored class bonuses ({c.favoredClassIds.map(className).join(', ') || '—'})</span>
      <ul class="flex flex-wrap gap-x-3">
        {#if app.d.fcb.hp}<li>+{app.d.fcb.hp} HP</li>{/if}
        {#if app.d.fcb.skill}<li>+{app.d.fcb.skill} skill rank{app.d.fcb.skill === 1 ? '' : 's'}</li>{/if}
        {#each app.d.fcb.other as o (o.label)}
          <li title="Total {o.amount}, rounded down to +{o.value}">{o.label} +{o.amount}{o.amount.includes('/') ? ` (+${o.value})` : ''}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {/snippet}
  </EditMode>
</Section>
