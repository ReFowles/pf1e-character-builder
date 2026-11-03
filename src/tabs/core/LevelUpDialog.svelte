<script lang="ts">
  import { tick } from 'svelte';
  import { make } from '../../lib/model/defaults';
  import { ABILITIES, ABILITY_NAMES, SAVES, SAVE_NAMES, type Ability, type ClassDef } from '../../lib/model/types';
  import { classData } from '../../lib/db/classData.svelte';
  import { derive } from '../../lib/rules/derive';
  import { levelClassIds } from '../../lib/rules/gestalt';
  import { prestigeLevelOf } from '../../lib/rules/prestige';
  import { archetypesFor, findDbClass, isFeature, progression, spellGains, spellTableFor, universalGains, type ProgressionFeature } from '../../lib/rules/progression';
  import { roll } from '../../lib/dice/rolls.svelte';
  import { SECTION_BY_ID } from '../../lib/sections';
  import { app } from '../../lib/state.svelte';
  import Modal from '../../lib/ui/Modal.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import Select from '../../lib/ui/Select.svelte';
  import { classLabel } from '../../lib/ui/options';

  interface Props {
    open: boolean;
    /** Index into the character's levels. */
    index: number;
  }
  let { open = $bindable(), index }: Props = $props();

  $effect(() => {
    if (open) classData.load();
  });

  const c = $derived(app.char);
  const d = $derived(app.d);
  const l = $derived(c.levels[index]);
  const level = $derived(index + 1);
  const u = $derived(universalGains(level));

  // The level's own class, and its gestalt class while that rule is on.
  const sides = $derived.by(() => {
    if (!l) return [];
    return levelClassIds(c, l).flatMap((id) => {
      const k = c.classes.find((x) => x.id === id);
      if (!k) return [];
      const classLevel = prestigeLevelOf(c, index, id);
      const db = findDbClass(classData.classes, k);
      const chosen = db ? k.archetypes.flatMap((n) => archetypesFor(classData.archetypes, db.id).find((a) => a.name === n) ?? []) : [];
      const p = db ? progression(db, { bab: k.bab, goodSaves: k.goodSaves, spellTable: spellTableFor(c, k) }, chosen) : null;
      const row = p?.rows[classLevel - 1];
      const features = row?.features.filter((f) => !f.replacedBy) ?? [];
      return [{ k, classLevel, db, p, features, spells: p ? spellGains(p.rows, classLevel) : null }];
    });
  });

  // What the sheet already worked out: the character before and after this level.
  const before = $derived(l ? derive({ ...c, levels: c.levels.slice(0, index) }) : null);
  const after = $derived(index === c.levels.length - 1 ? d : derive({ ...c, levels: c.levels.slice(0, index + 1) }));
  const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  const changes = $derived.by(() => {
    if (!before) return [];
    const out: string[] = [];
    if (after.bab !== before.bab) out.push(`Base attack bonus ${signed(before.bab)} → ${signed(after.bab)}`);
    for (const s of SAVES)
      if (after.baseSaves[s] !== before.baseSaves[s]) out.push(`${SAVE_NAMES[s]} base save ${signed(before.baseSaves[s])} → ${signed(after.baseSaves[s])}`);
    for (const id of l?.spellAdvance ?? []) {
      const k = c.classes.find((x) => x.id === id);
      if (k) out.push(`${classLabel(k)} caster level ${before.castingLevels[id] ?? 0} → ${after.castingLevels[id] ?? 0}`);
    }
    for (const s of sides) if (s.spells?.perDay.length) out.push(`${classLabel(s.k)} spells per day (${s.spells.perDay.map(spellLevelName).join(', ')})`);
    return out;
  });

  const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
  const spellLevelName = (s: number) => (s ? ordinal(s) : 'cantrips');

  // --- Hit points
  const hd = $derived(Math.max(...sides.map((s) => s.k.hd), 0) || 8);
  const maxFirst = $derived(index === 0 && c.maxHpFirstLevel);
  async function rollHp() {
    const r = await roll({ title: 'Hit points', subtitle: `Level ${level}`, notation: `1d${hd}` });
    if (r && l) l.hpRoll = r.total;
  }

  // --- Favored class bonus
  const favored = $derived(!!l && levelClassIds(c, l).some((id) => c.favoredClassIds.includes(id)));
  const knownOther = $derived.by(() => {
    const seen = new Map<string, string>();
    for (const x of c.levels) if (x.fcb.kind === 'other' && x.fcb.label.trim() && !seen.has(x.fcb.label.trim())) seen.set(x.fcb.label.trim(), x.fcb.amount || '1');
    return [...seen].map(([label, amount]) => ({ label, amount }));
  });
  const fcbValue = $derived(!l ? 'hp' : l.fcb.kind === 'other' ? `other:${l.fcb.label.trim()}` : l.fcb.kind);
  function setFcb(v: string) {
    if (!l) return;
    if (v === 'hp' || v === 'skill') l.fcb = { kind: v, label: '', amount: '' };
    else {
      const o = knownOther.find((x) => `other:${x.label}` === v);
      if (o) l.fcb = { kind: 'other', label: o.label, amount: o.amount };
    }
  }

  // --- Feats: the level's own feat plus class bonus feats ("Bonus Feats", "Bloodline Feat", "Combat Feat"…).
  const bonusFeats = $derived(sides.flatMap((s) => s.features.filter((f) => /\bfeats?\b/i.test(f.name)).map((f) => ({ k: s.k, f }))));
  const featsNeeded = $derived((u.feat ? 1 : 0) + bonusFeats.length);
  const featsTaken = $derived(c.feats.filter((f) => f.level === level).length);

  // --- Class features
  const onSheet = (k: ClassDef, name: string) => c.classAbilities.some((a) => a.classId === k.id && isFeature(a.name, name));
  function toggleFeature(k: ClassDef, f: ProgressionFeature) {
    const i = c.classAbilities.findIndex((a) => a.classId === k.id && isFeature(a.name, f.name));
    if (i >= 0) c.classAbilities.splice(i, 1);
    else c.classAbilities.push({ ...make.classAbility(k.id, level), name: f.name, description: f.description });
  }

  // Reminders the sheet can't check, ticked off by hand for this visit.
  let ticked = $state<Record<string, boolean>>({});
  $effect(() => {
    void index;
    ticked = {};
  });

  async function goTo(section: string) {
    const tab = SECTION_BY_ID[section]?.tab;
    if (tab && app.tab !== tab) app.setTab(tab);
    await tick();
    document.querySelector(`[data-section="${section}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function addFeat() {
    c.feats.push(make.feat(level));
    void goTo('feats');
  }
  const raise = (a: Ability) => (c.abilities[a].level += 1);
  const remaining = $derived(d.skillRanks.available - d.skillRanks.spent);
</script>

{#snippet status(done: boolean)}
  <span class={['status', done ? 'text-gold' : 'opacity-40']} aria-label={done ? 'Done' : 'To do'}>{done ? '✓' : '○'}</span>
{/snippet}

<Modal
  bind:open
  flyout
  width="max-w-sm"
  title="Level {level} checklist"
  subtitle={sides.map((s) => `${classLabel(s.k)} ${s.classLevel}`).join(' / ') || undefined}
>
  {#if !l}
    <p>This level no longer exists.</p>
  {:else}
    {#if changes.length}
      <div>
        <h3 class="field-label">Updated for you</h3>
        <ul class="list-inside list-disc text-sm">
          {#each changes as x (x)}<li>{x}</li>{/each}
          <li>Skill ranks available {before?.skillRanks.available ?? 0} → {after.skillRanks.available}</li>
        </ul>
      </div>
    {/if}

    <h3 class="field-label">To do</h3>
    <ol class="flex flex-col gap-3 text-sm">
      <li class="item">
        {@render status(maxFirst || l.hpRoll > 0)}
        <div class="flex flex-col gap-1">
          <strong>Hit points</strong>
          {#if maxFirst}
            <span class="opacity-70">1st level takes the maximum ({hd}), per Settings.</span>
          {:else}
            <div class="flex flex-wrap items-center gap-2">
              <NumInput class="w-14" bind:value={l.hpRoll} aria-label="HP rolled at level {level}" />
              <span class="opacity-60">/ d{hd}</span>
              <button type="button" class="btn" onclick={rollHp}>Roll</button>
              <button type="button" class="btn" title="Half the die plus 1, a common table rule" onclick={() => (l.hpRoll = hd / 2 + 1)}>Average ({hd / 2 + 1})</button>
            </div>
            <span class="text-xs opacity-60">Con and favored class HP are added for you.</span>
          {/if}
        </div>
      </li>

      {#if favored}
        <li class="item">
          {@render status(true)}
          <div class="flex flex-col gap-1">
            <strong>Favored class bonus</strong>
            <Select
              class="max-w-56"
              value={fcbValue}
              onchange={setFcb}
              options={[
                { value: 'hp', label: '+1 HP' },
                { value: 'skill', label: '+1 skill rank' },
                ...knownOther.map((o) => ({ value: `other:${o.label}`, label: `+${o.amount} ${o.label}` })),
              ]}
              aria-label="Favored class bonus at level {level}"
            />
            <span class="text-xs opacity-60">Other bonuses can be entered in Level history.</span>
          </div>
        </li>
      {/if}

      <li class="item">
        {@render status(remaining === 0)}
        <div class="flex flex-col gap-1">
          <strong>Skill ranks</strong>
          <span class={{ 'text-accent': remaining < 0 }}>{remaining > 0 ? `${remaining} of ${d.skillRanks.available} ranks left to spend.` : remaining < 0 ? `${-remaining} more ranks spent than available.` : 'All ranks spent.'}</span>
          <button type="button" class="btn self-start" onclick={() => goTo('skills')}>Go to Skills</button>
        </div>
      </li>

      {#if featsNeeded}
        <li class="item">
          {@render status(featsTaken >= featsNeeded)}
          <div class="flex flex-col gap-1">
            <strong>Feat{featsNeeded > 1 ? 's' : ''}</strong>
            <ul class="list-inside list-disc">
              {#if u.feat}<li>1 feat for reaching level {level}</li>{/if}
              {#each bonusFeats as b, i (i)}<li>{b.f.label} ({classLabel(b.k)})</li>{/each}
            </ul>
            <span class="opacity-70">{featsTaken} of {featsNeeded} on the sheet at level {level}.</span>
            <button type="button" class="btn self-start" onclick={addFeat}>Add a level {level} feat</button>
          </div>
        </li>
      {/if}

      {#if u.ability}
        {@const done = d.abilityIncreases.used >= d.abilityIncreases.expected}
        <li class="item">
          {@render status(done)}
          <div class="flex flex-col gap-1">
            <strong>Ability score increase</strong>
            {#if done}
              <span class="opacity-70">{d.abilityIncreases.used} of {d.abilityIncreases.expected} increases assigned (Ability Scores, Level column).</span>
            {:else}
              <span>Add +1 to one ability score:</span>
              <div class="flex flex-wrap gap-1">
                {#each ABILITIES as a (a)}
                  <button type="button" class="btn" title={ABILITY_NAMES[a]} onclick={() => raise(a)}>{a.toUpperCase()} {d.abilities[a].score}</button>
                {/each}
              </div>
            {/if}
          </div>
        </li>
      {/if}

      {#each sides as s (s.k.id)}
        {@const done = s.features.every((f) => onSheet(s.k, f.name))}
        {@const spellbook = !!s.spells && spellTableFor(c, s.k) === 'wizard' && /wizard|arcanist/i.test(s.k.name)}
        {@const key = `spells:${s.k.id}`}
        <li class="item">
          {@render status(!s.db || done)}
          <div class="flex flex-col gap-1">
            <strong>{classLabel(s.k)} {s.classLevel} class features</strong>
            {#if classData.status !== 'ready' && classData.status !== 'error'}
              <span class="opacity-60">Loading…</span>
            {:else if !s.db}
              <span class="opacity-70">No class table for “{classLabel(s.k)}”; check its features by hand.</span>
            {:else if !s.features.length}
              <span class="opacity-70">No new features at this level.</span>
            {:else}
              {#each s.features as f, i (i)}
                <label class="flex items-start gap-2" title={f.summary}>
                  <input type="checkbox" class="mt-1" checked={onSheet(s.k, f.name)} onchange={() => toggleFeature(s.k, f)} />
                  <span>
                    <span class={{ 'text-accent': f.archetype }}>{f.label}</span>
                    <span class="text-xs opacity-60">{f.first ? 'new' : 'improves'}{f.archetype ? ` · ${f.archetype}` : ''}</span>
                  </span>
                </label>
              {/each}
              <span class="text-xs opacity-60">Ticked features are on the Class Abilities list.</span>
            {/if}
          </div>
        </li>

        {#if s.spells && (s.spells.newLevels.length || s.spells.known.length || spellbook)}
            <li class="item">
              {@render status(!!ticked[key])}
              <div class="flex flex-col gap-1">
                <strong>{classLabel(s.k)} spells</strong>
                <ul class="list-inside list-disc">
                  {#if s.spells.newLevels.length}<li>New spell level: {s.spells.newLevels.map(spellLevelName).join(', ')}</li>{/if}
                  {#each s.spells.known as x (x.level)}<li>Learn {x.count} {x.level ? `${ordinal(x.level)}-level spell${x.count > 1 ? 's' : ''}` : `cantrip${x.count > 1 ? 's' : ''}`}</li>{/each}
                  {#if spellbook}<li>Add 2 spells to your spellbook</li>{/if}
                </ul>
                <div class="flex flex-wrap gap-2">
                  {#if c.spellsTab}<button type="button" class="btn" onclick={() => app.setTab('spells')}>Go to Spells</button>{/if}
                  <label class="inline-flex items-center gap-1"><input type="checkbox" bind:checked={ticked[key]} /> Done</label>
                </div>
              </div>
            </li>
        {/if}
      {/each}
    </ol>
  {/if}

  {#snippet footer()}
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs opacity-60">Reopen with the checklist button by Level, or per level in Level history.</span>
      <button type="button" class="btn-primary" onclick={() => (open = false)}>Done</button>
    </div>
  {/snippet}
</Modal>

<style>
  .item {
    display: grid;
    grid-template-columns: 1.25rem 1fr;
    gap: 0.25rem;
  }
  .status {
    font-weight: 700;
    line-height: 1.4;
  }
</style>
