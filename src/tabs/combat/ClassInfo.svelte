<script lang="ts">
  import { classKnowledges, make } from '../../lib/model/defaults';
  import type { ClassDef, LevelEntry, Save } from '../../lib/model/types';
  import { CLASS_PRESETS, findPreset, type ClassPreset } from '../../lib/rules/classPresets';
  import { subtypeKey } from '../../lib/rules/skills';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import Stat from '../../lib/ui/Stat.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import Chevron from '../../lib/ui/Chevron.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';

  const c = $derived(app.char);
  let showRolls = $state(false);
  let showLog = $state(false);
  let editing = $state(false);
  let newLevelClass = $state('');
  const BAB_LABEL = { full: 'full BAB', '3/4': '¾ BAB', '1/2': '½ BAB' };
  const SPEED_MODES = ['fly', 'swim', 'climb', 'burrow'];
  const MANEUVERABILITY = ['clumsy', 'poor', 'average', 'good', 'perfect'];

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
    });
    ensureKnowledgeRows(preset.classSkills);
  }

  function onName(k: ClassDef) {
    const preset = findPreset(k.name);
    if (preset && preset.id !== k.presetId) applyPreset(k, preset);
  }

  function addClass() {
    const k = make.classDef();
    c.classes.push(k);
    if (!c.favoredClassId) c.favoredClassId = k.id;
    newLevelClass = k.id;
  }

  function removeClass(i: number) {
    const k = c.classes[i];
    const taken = c.levels.filter((l) => l.classId === k.id).length;
    if (taken && !confirm(`Remove ${k.name || 'this class'} and its ${taken} level(s)?`)) return;
    c.levels = c.levels.filter((l) => l.classId !== k.id);
    c.classes.splice(i, 1);
    if (c.favoredClassId === k.id) c.favoredClassId = c.classes[0]?.id ?? null;
  }

  function addLevel() {
    const id = newLevelClass || c.favoredClassId || c.classes[0]?.id;
    if (!id) return;
    c.levels.push(make.level(id));
  }

  function toggleSave(k: ClassDef, s: Save) {
    k.goodSaves = k.goodSaves.includes(s) ? k.goodSaves.filter((x) => x !== s) : [...k.goodSaves, s];
  }

  const className = (id: string) => c.classes.find((k) => k.id === id)?.name || '—';

  // Named "other" FCBs already used, offered as choices on every favored level.
  const knownOther = $derived.by(() => {
    const seen = new Map<string, string>();
    for (const l of c.levels)
      if (l.fcb.kind === 'other' && l.fcb.label.trim() && !seen.has(l.fcb.label.trim())) seen.set(l.fcb.label.trim(), l.fcb.amount || '1');
    return [...seen].map(([label, amount]) => ({ label, amount }));
  });

  // Levels whose new "other" FCB is being typed; keeps the inputs open until committed.
  let draftFcb = $state<Record<string, boolean>>({});

  const fcbValue = (l: LevelEntry) =>
    l.fcb.kind !== 'other'
      ? l.fcb.kind
      : draftFcb[l.id] || !knownOther.some((o) => o.label === l.fcb.label.trim())
        ? 'new'
        : `other:${l.fcb.label.trim()}`;

  function setFcb(l: LevelEntry, v: string) {
    if (v === 'hp' || v === 'skill') l.fcb = { kind: v, label: '', amount: '' };
    else if (v === 'new') {
      l.fcb = { kind: 'other', label: '', amount: '1' };
      draftFcb[l.id] = true;
    }
    else {
      const o = knownOther.find((x) => `other:${x.label}` === v)!;
      l.fcb = { kind: 'other', label: o.label, amount: o.amount };
    }
  }
</script>

<Section id="classes">
  {#snippet actions()}
    <button type="button" class="rounded-sm px-1.5 text-xs hover:bg-paper/20" aria-pressed={editing} onclick={() => (editing = !editing)}>
      {editing ? 'Done' : 'Edit'}
    </button>
  {/snippet}
  <datalist id="class-presets">
    {#each CLASS_PRESETS as p (p.id)}<option value={p.name}>{p.source}</option>{/each}
  </datalist>

  <div class="overflow-x-auto">
    <table class="dyn-table">
      <thead>
        <tr>
          <th title="Favored class"><span class="sr-only">Favored</span>★</th>
          <th>Class</th>
          <th class="text-center">Lvl</th>
          {#if editing}
            <th class="text-center">HD</th>
            <th class="text-center">BAB</th>
            <th class="text-center">Good saves</th>
            <th class="text-center" title="Skill ranks per level">Ranks</th>
            <th></th>
          {:else}
            <th>Progression</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each c.classes as k, i (k.id)}
          {@const fav = c.favoredClassId === k.id}
          <tr>
            <td class="w-6 text-center align-middle">
              <button
                type="button"
                class={['text-lg leading-none', fav ? 'text-gold' : 'opacity-25 hover:opacity-60 print:invisible']}
                aria-pressed={fav}
                aria-label="Favored class: {k.name || 'unnamed'}"
                title="Favored class"
                onclick={() => (c.favoredClassId = k.id)}>★</button
              >
            </td>
            <td><input list="class-presets" class="w-full font-semibold" bind:value={k.name} onchange={() => onName(k)} placeholder="Class name" aria-label="Class name" /></td>
            <td class="text-center align-middle font-bold tabular-nums">{app.d.classLevels[k.id] ?? 0}</td>
            {#if editing}
              <td>
                <select class="w-16" bind:value={k.hd} aria-label="Hit die">
                  {#each [6, 8, 10, 12] as hd (hd)}<option value={hd}>d{hd}</option>{/each}
                </select>
              </td>
              <td>
                <select class="w-16" bind:value={k.bab} aria-label="BAB progression">
                  <option value="full">Full</option>
                  <option value="3/4">¾</option>
                  <option value="1/2">½</option>
                </select>
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
              <td class="align-middle text-xs whitespace-nowrap opacity-70">d{k.hd} · {BAB_LABEL[k.bab]} · {k.goodSaves.map((s) => s[0].toUpperCase()).join('') || '—'} · {k.skillRanks}+Int</td>
            {/if}
          </tr>
        {/each}
        <tr class="print-row hidden print:table-row"><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="flex flex-wrap items-center gap-2 print:hidden">
    {#if editing || !c.classes.length}<button type="button" class="add-btn" onclick={addClass}>+ Class</button>{/if}
    {#if c.classes.length}
      <select
        bind:value={() => newLevelClass || c.favoredClassId || c.classes[0]?.id, (v) => (newLevelClass = v ?? '')}
        aria-label="Class for new level"
        class="text-sm"
      >
        {#each c.classes as k (k.id)}<option value={k.id}>{k.name || 'Unnamed class'}</option>{/each}
      </select>
      <button type="button" class="btn-primary" onclick={addLevel}>+ Level</button>
      <button type="button" class="btn inline-flex items-center gap-1" aria-expanded={showLog} onclick={() => (showLog = !showLog)}>
        Level history <Chevron open={showLog} />
      </button>
    {/if}
  </div>

  {#if showLog && c.levels.length}
    <div class="overflow-x-auto print:hidden">
      <table class="dyn-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Class</th>
            <th class="text-center">
              HP roll
              <button type="button" class="ml-1 underline" onclick={() => (showRolls = !showRolls)}>{showRolls ? 'hide' : 'show'}</button>
            </th>
            <th>Favored class bonus</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each c.levels as l, i (l.id)}
            <tr>
              <td class="align-middle tabular-nums">{i + 1}</td>
              <td class="w-28">
                <select class="w-full" bind:value={l.classId} aria-label="Class for level {i + 1}">
                  {#each c.classes as k (k.id)}<option value={k.id}>{k.name || 'Unnamed class'}</option>{/each}
                </select>
              </td>
              <td class="w-20 text-center align-middle">
                {#if i === 0 && c.maxHpFirstLevel}
                  <span class="text-xs opacity-60" title="Max HP at 1st level (change in Config)">max</span>
                {:else if showRolls}
                  <NumInput bind:value={l.hpRoll} aria-label="HP rolled at level {i + 1}" />
                {:else}
                  <span class="opacity-40">•••</span>
                {/if}
              </td>
              <td>
                {#if l.classId === c.favoredClassId}
                  <div class="flex flex-wrap gap-1">
                    <select class="max-w-48" value={fcbValue(l)} onchange={(e) => setFcb(l, e.currentTarget.value)} aria-label="Favored class bonus at level {i + 1}">
                      <option value="hp">+1 HP</option>
                      <option value="skill">+1 skill rank</option>
                      {#each knownOther as o (o.label)}<option value="other:{o.label}">+{o.amount} {o.label}</option>{/each}
                      <option value="new">Other…</option>
                    </select>
                    {#if fcbValue(l) === 'new'}
                      <input class="w-14 text-center" bind:value={l.fcb.amount} placeholder="1/3" aria-label="Amount per level" title="Amount gained this level, e.g. 1/3" />
                      <input class="min-w-24 flex-1" bind:value={l.fcb.label} placeholder="e.g. channel damage" aria-label="Alternate favored class bonus" onchange={() => (draftFcb[l.id] = false)} />
                    {/if}
                  </div>
                {:else}
                  <span class="text-xs opacity-50">not favored class</span>
                {/if}
              </td>
              <td><button type="button" class="icon-btn text-accent" aria-label="Remove level {i + 1}" onclick={() => c.levels.splice(i, 1)}>✕</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if app.d.fcb.hp || app.d.fcb.skill || app.d.fcb.other.length}
    <div class="text-sm">
      <span class="field-label">Favored class bonuses ({className(c.favoredClassId ?? '')})</span>
      <ul class="flex flex-wrap gap-x-3">
        {#if app.d.fcb.hp}<li>+{app.d.fcb.hp} HP</li>{/if}
        {#if app.d.fcb.skill}<li>+{app.d.fcb.skill} skill rank{app.d.fcb.skill === 1 ? '' : 's'}</li>{/if}
        {#each app.d.fcb.other as o (o.label)}
          <li title="Total {o.amount}, rounded down to +{o.value}">{o.label} +{o.amount}{o.amount.includes('/') ? ` (+${o.value})` : ''}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="mt-auto flex flex-wrap items-stretch gap-1.5 border-t border-ink/20 pt-2">
    <Stat label="Initiative" value={app.d.init} big />
    <div class="stat" title={app.d.speed.encumbered ? 'Reduced by armor or load' : undefined}>
      <div class="stat-value text-3xl">{app.d.speed.base}<span class="text-xs">ft</span></div>
      <div class="field-label">Speed{app.d.speed.encumbered ? '*' : ''}</div>
    </div>
    {#each c.speeds.other as s, i (s.id)}
      <div class="stat">
        {#if editing}
          <div class="flex items-center gap-0.5">
            <NumInput class="w-12" bind:value={s.value} aria-label="{s.mode} speed" />
            <button type="button" class="icon-btn text-accent" aria-label="Remove {s.mode} speed" onclick={() => c.speeds.other.splice(i, 1)}>✕</button>
          </div>
          <select class="w-full text-xs capitalize" bind:value={s.mode} aria-label="Movement mode">
            {#each SPEED_MODES as m (m)}<option value={m}>{m}</option>{/each}
          </select>
          {#if s.mode === 'fly'}
            <select class="w-full text-xs" bind:value={s.maneuverability} aria-label="Fly maneuverability">
              <option value="">—</option>
              {#each MANEUVERABILITY as m (m)}<option value={m}>{m}</option>{/each}
            </select>
          {/if}
        {:else}
          <div class="stat-value text-3xl">{s.value}<span class="text-xs">ft</span></div>
          <div class="field-label">{s.mode}{s.maneuverability ? ` (${s.maneuverability})` : ''}</div>
        {/if}
      </div>
    {/each}
    <button
      type="button"
      class="add-btn self-center print:hidden"
      onclick={() => {
        c.speeds.other.push(make.otherSpeed('fly'));
        editing = true;
      }}>+ Speed</button
    >
    <div class="stat ml-auto">
      <NumInput class="stat-value w-14" bind:value={c.heroPoints} aria-label="Hero points" />
      <div class="field-label">Hero pts</div>
    </div>
  </div>
  {#if editing}
    <div class="flex gap-2 print:hidden">
      <Field label="Base speed" class="w-24"><NumInput bind:value={c.speeds.base} /></Field>
      <Field label="Armored (0 = calc)" class="w-32"><NumInput bind:value={c.speeds.armored} /></Field>
    </div>
  {/if}
  <div class="print:hidden"><BonusList keys={['init', 'speed']} label="Initiative / speed bonuses" /></div>
</Section>
