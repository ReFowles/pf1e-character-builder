<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import type { ClassDef, Save } from '../../lib/model/types';
  import { CLASS_PRESETS, findPreset, type ClassPreset } from '../../lib/rules/classPresets';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import Stat from '../../lib/ui/Stat.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';

  const c = $derived(app.char);
  let showRolls = $state(false);
  let showLog = $state(false);
  let editing = $state(false);
  const BAB_LABEL = { full: 'full BAB', '3/4': '¾ BAB', '1/2': '½ BAB' };
  let newLevelClass = $state('');

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
    const id = newLevelClass || c.classes[0]?.id;
    if (!id) return;
    const entry = make.level(id);
    if (id !== c.favoredClassId) entry.fcb.kind = 'other';
    c.levels.push(entry);
  }

  function toggleSave(k: ClassDef, s: Save) {
    k.goodSaves = k.goodSaves.includes(s) ? k.goodSaves.filter((x) => x !== s) : [...k.goodSaves, s];
  }

  const className = (id: string) => c.classes.find((k) => k.id === id)?.name || '—';
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
          <th title="Favored class">Fav</th>
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
          <tr>
            <td class="text-center">
              <input type="radio" name="favored" aria-label="Favored class" checked={c.favoredClassId === k.id} onchange={() => (c.favoredClassId = k.id)} />
            </td>
            <td><input list="class-presets" class="w-full font-semibold" bind:value={k.name} onchange={() => onName(k)} placeholder="Class name" aria-label="Class name" /></td>
            <td class="text-center font-bold tabular-nums">{app.d.classLevels[k.id] ?? 0}</td>
            {#if editing}
            <td>
              <select class="w-14" bind:value={k.hd} aria-label="Hit die">
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
            <td class="whitespace-nowrap text-center">
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
            <td class="text-xs whitespace-nowrap opacity-70">d{k.hd} · {BAB_LABEL[k.bab]} · {k.goodSaves.map((s) => s[0].toUpperCase()).join() || '—'} · {k.skillRanks}+Int</td>
            {/if}
          </tr>
        {/each}
        <tr class="print-row hidden print:table-row"><td></td><td></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="flex flex-wrap items-center gap-2 print:hidden">
    {#if editing || !c.classes.length}<button type="button" class="add-btn" onclick={addClass}>+ Class</button>{/if}
    {#if c.classes.length}
      <select bind:value={() => newLevelClass || c.favoredClassId || c.classes[0]?.id, (v) => (newLevelClass = v ?? "")} aria-label="Class for new level" class="border border-ink/30 text-sm">
        {#each c.classes as k (k.id)}<option value={k.id}>{k.name || 'Unnamed class'}</option>{/each}
      </select>
      <button type="button" class="btn-primary" onclick={addLevel}>+ Level</button>
      <button type="button" class="btn" aria-expanded={showLog} onclick={() => (showLog = !showLog)}>
        Level history ({c.levels.length})
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
              <td class="tabular-nums">{i + 1}</td>
              <td>
                <select bind:value={l.classId} aria-label="Class for level {i + 1}">
                  {#each c.classes as k (k.id)}<option value={k.id}>{k.name || 'Unnamed class'}</option>{/each}
                </select>
              </td>
              <td class="w-20 text-center">
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
                  <div class="flex gap-1">
                    <select bind:value={l.fcb.kind} aria-label="Favored class bonus at level {i + 1}">
                      <option value="hp">+1 HP</option>
                      <option value="skill">+1 skill rank</option>
                      <option value="other">Other</option>
                    </select>
                    {#if l.fcb.kind === 'other'}
                      <input class="flex-1" bind:value={l.fcb.note} placeholder="e.g. +1/6 rage power" aria-label="Alternate favored class bonus" />
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

  {@const fcbs = c.levels.filter((l) => l.classId === c.favoredClassId)}
  {#if fcbs.length}
    <div class="text-sm">
      <span class="field-label">Favored class bonuses ({className(c.favoredClassId ?? '')})</span>
      <div>
        {fcbs.filter((l) => l.fcb.kind === 'hp').length} HP ·
        {fcbs.filter((l) => l.fcb.kind === 'skill').length} skill ranks
        {#each fcbs.filter((l) => l.fcb.kind === 'other' && l.fcb.note) as l (l.id)}· {l.fcb.note} {/each}
      </div>
    </div>
  {/if}

  <div class="mt-auto grid grid-cols-[1fr_auto_auto] items-end gap-2 border-t border-ink/20 pt-2">
    <div class="grid grid-cols-4 gap-1">
      <div class="stat col-span-1" title={app.d.speed.encumbered ? 'Reduced by armor or load' : undefined}>
        <div class="stat-value">{app.d.speed.base}<span class="text-xs">ft</span></div>
        <div class="field-label">Speed{app.d.speed.encumbered ? '*' : ''}</div>
      </div>
      <Field label="Base"><NumInput bind:value={c.speeds.base} /></Field>
      <Field label="Fly"><NumInput bind:value={c.speeds.fly} /></Field>
      <Field label="Swim"><NumInput bind:value={c.speeds.swim} /></Field>
      <Field label="Armored" class="col-start-2"><NumInput bind:value={c.speeds.armored} title="Leave 0 to calculate" /></Field>
      <Field label="Climb"><NumInput bind:value={c.speeds.climb} /></Field>
      <Field label="Burrow"><NumInput bind:value={c.speeds.burrow} /></Field>
    </div>
    <Stat label="Initiative" value={app.d.init} big />
    <div class="stat">
      <NumInput class="stat-value w-12 border-0" bind:value={c.heroPoints} aria-label="Hero points" />
      <div class="field-label">Hero pts</div>
    </div>
  </div>
  <div class="print:hidden"><BonusList keys={['init', 'speed']} label="Initiative / speed bonuses" /></div>
</Section>
