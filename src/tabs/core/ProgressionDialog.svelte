<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { classData } from '../../lib/db/classData.svelte';
  import { archetypesFor, characterLevelsFor, findDbClass, isFeature, progression, spellTableFor, universalGains, type ProgressionFeature } from '../../lib/rules/progression';
  import { app } from '../../lib/state.svelte';
  import Modal from '../../lib/ui/Modal.svelte';
  import Combobox from '../../lib/ui/Combobox.svelte';
  import { classLabel } from '../../lib/ui/options';

  interface Props {
    open: boolean;
    classId: string;
  }
  let { open = $bindable(), classId }: Props = $props();

  $effect(() => {
    if (open) classData.load();
  });

  const c = $derived(app.char);
  const k = $derived(c.classes.find((x) => x.id === classId));
  const db = $derived(k ? findDbClass(classData.classes, k) : undefined);
  const options = $derived(db ? archetypesFor(classData.archetypes, db.id) : []);
  const chosen = $derived(k ? k.archetypes.flatMap((n) => options.find((a) => a.name === n) ?? []) : []);
  const p = $derived(k && db ? progression(db, { bab: k.bab, goodSaves: k.goodSaves, spellTable: spellTableFor(c, k) }, chosen) : null);
  const classLevel = $derived(k ? (app.d.classLevels[k.id] ?? 0) : 0);
  const charLevels = $derived(k && p ? characterLevelsFor(c, k.id, p.rows.length) : []);
  /** Multiclass characters see which character level each class level lands on. */
  const multiclass = $derived(charLevels.some((n, i) => n !== i + 1));
  const prestigeSpells = $derived(!!p?.rows.some((r) => r.spellsText));

  let query = $state('');
  let picked = $state<{ f: ProgressionFeature; level: number } | null>(null);
  // Reopening starts without a selected feature.
  $effect(() => {
    if (!open) picked = null;
  });

  const ARCHETYPE_OPTIONS = $derived(
    options.filter((a) => !k?.archetypes.includes(a.name)).map((a) => ({ value: a.name, title: a.summary })),
  );

  function addArchetype(name: string, isPick: boolean) {
    if (!k || !isPick || !options.some((a) => a.name === name)) return;
    if (!k.archetypes.includes(name)) k.archetypes.push(name);
    query = '';
  }
  const removeArchetype = (name: string) => k && (k.archetypes = k.archetypes.filter((n) => n !== name));

  const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
  const onSheet = (name: string) => !!k && c.classAbilities.some((a) => a.classId === k.id && isFeature(a.name, name));

  function addToSheet(f: ProgressionFeature, level: number) {
    if (!k || onSheet(f.name)) return;
    // The Class Abilities level is the character level the feature arrives at, not the class level.
    c.classAbilities.push({ ...make.classAbility(k.id, charLevels[level - 1] ?? level), name: f.name, description: f.description });
    app.notify(`${f.name} added to Class Abilities`);
  }
</script>

<Modal bind:open title="{k ? classLabel(k) : 'Class'} progression" subtitle={db?.summary} width="max-w-5xl">
  {#if !k}
    <p>This class no longer exists.</p>
  {:else if classData.status === 'error'}
    <p class="text-accent">The class data could not be loaded.</p>
  {:else if classData.status !== 'ready'}
    <p class="opacity-60">Loading…</p>
  {:else if !db || !p}
    <p>No class table for “{classLabel(k)}”. Pick a class from the class list to see its progression.</p>
  {:else}
    {#if options.length}
      <div class="flex flex-wrap items-center gap-2">
        <span class="field-label">Archetypes</span>
        {#each chosen as a (a.name)}
          <span class="chip" title={a.summary}>
            {a.name}
            <button type="button" class="opacity-60 hover:opacity-100" aria-label="Remove {a.name}" onclick={() => removeArchetype(a.name)}>✕</button>
          </span>
        {/each}
        <Combobox class="w-56 text-sm" bind:value={query} options={ARCHETYPE_OPTIONS} oncommit={addArchetype} placeholder="Add an archetype ({options.length})…" aria-label="Add an archetype" />
      </div>
      {#if p.conflicts.length}
        <p class="text-sm text-accent">These archetypes change the same features, so they can't be combined: {p.conflicts.join('; ')}.</p>
      {/if}
    {/if}

    <div class="overflow-x-auto">
      <table class="progression-table w-full text-sm">
        <thead>
          <tr>
            <th class="text-center">Lv</th>
            <th>BAB</th>
            <th>Fort</th>
            <th>Ref</th>
            <th>Will</th>
            <th class="w-full min-w-48">Special</th>
            {#if prestigeSpells}<th class="min-w-48">Spellcasting</th>{/if}
            {#each p.spellLevels as s (s)}<th class="text-center" title="{s ? ordinal(s) : 'Cantrips/orisons'}-level spells per day">{s ? ordinal(s) : '0'}</th>{/each}
            <th title="Every character gains these by total character level">Character</th>
          </tr>
        </thead>
        <tbody>
          {#each p.rows as r (r.level)}
            {@const reached = r.level <= classLevel}
            {@const cl = charLevels[r.level - 1]}
            {@const u = universalGains(cl)}
            <tr class={[reached ? 'reached' : 'opacity-45', { current: r.level === classLevel }]}>
              <td class="text-center font-bold tabular-nums">{r.level}</td>
              <td class="whitespace-nowrap tabular-nums">{r.bab}</td>
              <td class="tabular-nums">{r.saves.fort}</td>
              <td class="tabular-nums">{r.saves.ref}</td>
              <td class="tabular-nums">{r.saves.will}</td>
              <td>
                <!-- Each feature keeps its comma, so lines only break between features. -->
                {#each r.features as f, i (i)}
                  <span class="whitespace-nowrap"
                    ><button
                      type="button"
                      class={['feature', { 'text-accent': f.archetype, 'line-through opacity-60': f.replacedBy, 'font-semibold': f.first && !f.replacedBy }]}
                      title={f.replacedBy ? `Replaced by ${f.replacedBy}` : f.archetype ? `${f.archetype}: ${f.summary}` : f.summary}
                      aria-pressed={picked?.f === f}
                      onclick={() => (picked = picked?.f === f ? null : { f, level: r.level })}>{f.label}</button
                    >{#if i < r.features.length - 1}<span class="opacity-50">,</span>{/if}</span
                  >{' '}
                {:else}<span class="opacity-40">—</span>{/each}
              </td>
              {#if prestigeSpells}<td class="text-xs">{r.spellsText || '—'}</td>{/if}
              {#each p.spellLevels as s (s)}
                {@const n = r.perDay?.[s]}
                <td class="text-center tabular-nums">{n ?? (s === 0 && r.known?.[0] != null ? '∞' : '—')}</td>
              {/each}
              <td class="text-xs whitespace-nowrap">
                {#if multiclass}<span class="opacity-60" title="Character level">Lv {cl}</span>{/if}
                {[u.feat && 'Feat', u.ability && '+1 ability'].filter(Boolean).join(', ')}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#snippet footer()}
    {#if picked}
      {@const f = picked.f}
      <div class="flex max-h-[40vh] flex-col gap-1 overflow-y-auto text-sm">
        <div class="flex flex-wrap items-baseline gap-2">
          <strong class="font-display text-base">{f.name}</strong>
          <span class="opacity-60">{ordinal(picked.level)} level{f.archetype ? ` · ${f.archetype}` : ''}{f.first ? '' : ' · improves'}</span>
          {#if f.replacedBy}<span class="text-accent">Replaced by {f.replacedBy}</span>{/if}
          <span class="flex-1"></span>
          {#if onSheet(f.name)}
            <span class="text-xs opacity-60">On the sheet ✓</span>
          {:else if !f.replacedBy}
            <button type="button" class="btn" onclick={() => addToSheet(f, picked!.level)}>Add to Class Abilities</button>
          {/if}
        </div>
        <p class="whitespace-pre-line">{f.description || f.summary || 'No description in the class data.'}</p>
        {#each f.tables ?? [] as t, ti (ti)}
          <div class="overflow-x-auto">
            <table class="feature-table">
              {#if t.title}<caption>{t.title}</caption>{/if}
              {#if t.head.length}<thead><tr>{#each t.head as h, hi (hi)}<th>{h}</th>{/each}</tr></thead>{/if}
              <tbody>
                {#each t.rows as row, ri (ri)}<tr>{#each row as cell, ci (ci)}<td>{cell}</td>{/each}</tr>{/each}
              </tbody>
            </table>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-xs opacity-60">
        {k ? (classLevel ? `${classLabel(k)} level ${classLevel}: levels you have are highlighted. ` : `No ${classLabel(k)} levels yet. `) : ''}Every level also brings a hit die and skill ranks. Click a feature for its description. Archetype features are in red; struck-through features are replaced.
      </p>
    {/if}
  {/snippet}
</Modal>

<style>
  .progression-table th {
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    opacity: 0.7;
    text-align: left;
    padding: 0.25rem 0.375rem;
    position: sticky;
    top: 0;
    background: var(--color-paper);
    border-bottom: 1px solid color-mix(in srgb, var(--color-ink) 30%, transparent);
  }
  .progression-table td {
    padding: 0.2rem 0.375rem;
    vertical-align: top;
    border-bottom: 1px solid color-mix(in srgb, var(--color-ink) 10%, transparent);
  }
  .progression-table tr.current td {
    background: color-mix(in srgb, var(--color-gold) 18%, transparent);
  }
  .progression-table tr.current td:first-child {
    box-shadow: inset 3px 0 0 var(--color-gold);
  }
  .feature-table {
    border-collapse: collapse;
    font-size: 0.8125rem;
  }
  .feature-table caption {
    caption-side: top;
    text-align: left;
    font-weight: 600;
    padding-bottom: 0.25rem;
  }
  .feature-table th,
  .feature-table td {
    padding: 0.125rem 0.75rem 0.125rem 0.375rem;
    text-align: left;
    border-bottom: 1px solid color-mix(in srgb, var(--color-ink) 15%, transparent);
  }
  .feature-table th {
    font-size: 0.6rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    opacity: 0.7;
    border-bottom-color: color-mix(in srgb, var(--color-ink) 35%, transparent);
  }
  .feature-table td:first-child {
    font-weight: 600;
    white-space: nowrap;
  }
  .feature {
    text-align: left;
    border-radius: 0.125rem;
  }
  .feature:hover,
  .feature[aria-pressed='true'] {
    background: color-mix(in srgb, var(--color-ink) 10%, transparent);
  }
</style>
