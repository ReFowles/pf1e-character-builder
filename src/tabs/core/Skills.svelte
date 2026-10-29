<script lang="ts">
  import { partsOf } from '../../lib/dice/roll';
  import { rollable } from '../../lib/dice/rollable';
  import { make } from '../../lib/model/defaults';
  import type { SkillEntry } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import { isClassSkill } from '../../lib/rules/skills';
  import { BONUS_KEYS } from '../../lib/rules/keys';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import Chevron from '../../lib/ui/Chevron.svelte';
  import { sortable } from '../../lib/ui/sortable';
  import { breakdown, fmt } from '../../lib/ui/format';

  const SKILL_KEYS = BONUS_KEYS.filter((k) => k.key.startsWith('skill')).map((k) => k.key);
  const c = $derived(app.char);
  const ranks = $derived(app.d.skillRanks);

  /** Favorites in the user's order; any not yet in favoriteOrder go last. */
  const favorites = $derived.by(() => {
    const favs = c.skills.filter((s) => s.favorite);
    const pos = new Map(c.favoriteOrder.map((id, i) => [id, i]));
    return favs.sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
  });
  const allMiscZero = $derived(c.skills.every((s) => !s.misc));
  const allOpen = $derived(!app.section('skills:all').collapsed);

  function toggleFavorite(e: SkillEntry) {
    e.favorite = !e.favorite;
    c.favoriteOrder = e.favorite ? [...c.favoriteOrder.filter((id) => id !== e.id), e.id] : c.favoriteOrder.filter((id) => id !== e.id);
  }

  function moveFavorite(from: number, to: number) {
    const ids = favorites.map((f) => f.id);
    const [x] = ids.splice(from, 1);
    ids.splice(to, 0, x);
    c.favoriteOrder = ids;
  }

  function addSubtype(e: SkillEntry) {
    // Insert after the last row of the same skill.
    const last = c.skills.findLastIndex((s) => s.skill === e.skill);
    c.skills.splice(last + 1, 0, make.skill(e.skill, ''));
  }

  function removeRow(e: SkillEntry) {
    c.skills.splice(c.skills.indexOf(e), 1);
    c.favoriteOrder = c.favoriteOrder.filter((id) => id !== e.id);
  }

  function toggleClassSkill(e: SkillEntry, checked: boolean) {
    const fromClass = isClassSkill(app.d.classSkills, e.skill, e.subtype);
    // Store an override only when it differs from the class list.
    if (checked === fromClass) delete e.classSkill;
    else e.classSkill = checked;
  }

  const siblings = (e: SkillEntry) => c.skills.filter((s) => s.skill === e.skill).length;
  const isLastOfSkill = (e: SkillEntry) => c.skills.findLast((s) => s.skill === e.skill) === e;
</script>

{#snippet row(e: SkillEntry, i: number, inFavorites: boolean, editing: boolean)}
  {@const sd = app.d.skills[e.id]}
  {#if sd}
    <tr class={[{ 'opacity-50': sd.unusable, 'print:hidden': !inFavorites && e.favorite }]} data-sort-index={inFavorites ? i : undefined}>
      {#if inFavorites && editing}
        <td class="w-4 print:hidden">
          <span class="cursor-grab touch-none px-0.5 opacity-40 select-none hover:opacity-80" data-sort-handle title="Drag to reorder" aria-hidden="true">⋮⋮</span>
        </td>
      {/if}
      <td class="w-5 text-center">
        <button
          type="button"
          class={['text-base leading-none', e.favorite ? 'text-gold' : 'opacity-30 print:hidden']}
          aria-pressed={e.favorite}
          aria-label="{e.favorite ? 'Unfavorite' : 'Favorite'} {sd.label}"
          onclick={() => toggleFavorite(e)}>★</button
        >
      </td>
      <td class="w-5 text-center">
        <input type="checkbox" class="align-middle" aria-label="{sd.label} is a class skill" checked={sd.classSkill} onchange={(ev) => toggleClassSkill(e, ev.currentTarget.checked)} />
      </td>
      <td class="w-full">
        <div class="flex items-center gap-1">
          <span class="whitespace-nowrap max-sm:text-sm" use:rollable={{ title: sd.label, bonus: sd.total, parts: partsOf(sd.breakdown) }}>
            {sd.def.name}{#if sd.def.trainedOnly}<sup title="Trained only" class="ml-0.5 font-bold text-accent">T</sup>{/if}{#if sd.def.acp}<sup title="Armor check penalty applies" class="ml-0.5">*</sup>{/if}
          </span>
          {#if sd.def.multi}
            {#if inFavorites}
              <span class="truncate text-sm">({e.subtype})</span>
            {:else}
              <input class="h-6 w-full min-w-12 flex-1 text-sm" bind:value={e.subtype} placeholder="type" aria-label="{sd.def.name} type" />
            {/if}
          {/if}
        </div>
      </td>
      <td class="text-center text-xs uppercase opacity-60">{sd.def.ability}</td>
      <td class="text-center font-bold tabular-nums" title={breakdown(sd.breakdown)}><span use:rollable={{ title: sd.label, bonus: sd.total, parts: partsOf(sd.breakdown) }}>{fmt(sd.total)}</span></td>
      <td class="w-9"><NumInput class="h-6" bind:value={e.ranks} aria-label="{sd.label} ranks" /></td>
      <td class={['w-9', { 'print:hidden': allMiscZero }]}><NumInput class="h-6" bind:value={e.misc} signed aria-label="{sd.label} misc" /></td>
      {#if editing}
        <td class="w-12 whitespace-nowrap print:hidden">
          {#if inFavorites}
            <button type="button" class="icon-btn size-5" aria-label="Move {sd.label} up" disabled={i === 0} onclick={() => moveFavorite(i, i - 1)}>↑</button>
            <button type="button" class="icon-btn size-5" aria-label="Move {sd.label} down" disabled={i === favorites.length - 1} onclick={() => moveFavorite(i, i + 1)}>↓</button>
          {:else if sd.def.multi && siblings(e) > 1}
            <button type="button" class="icon-btn size-5 text-accent" aria-label="Remove {sd.label}" onclick={() => removeRow(e)}>✕</button>
          {/if}
        </td>
      {/if}
    </tr>
    {#if editing && sd.def.multi && !inFavorites && isLastOfSkill(e)}
      <tr class="print:hidden">
        <td colspan="9" class="py-0 pl-12">
          <button type="button" class="text-xs underline opacity-70 hover:opacity-100" onclick={() => addSubtype(e)}>+ another {sd.def.name}</button>
        </td>
      </tr>
    {/if}
  {/if}
{/snippet}

{#snippet head(inFavorites: boolean, editing: boolean)}
  <thead>
    <tr>
      {#if inFavorites && editing}<th class="print:hidden"><span class="sr-only">Reorder</span></th>{/if}
      <th title="Favorite"><span class="sr-only">Favorite</span>★</th>
      <th title="Class skill">CS</th>
      <th>Skill</th>
      <th class="text-center">Abil</th>
      <th class="text-center">Total</th>
      <th class="text-center">Ranks</th>
      <th class={['text-center', { 'print:hidden': allMiscZero }]}>Misc</th>
      {#if editing}<th class="print:hidden"></th>{/if}
    </tr>
  </thead>
{/snippet}

<Section id="skills" editable>
  {#snippet actions()}
    <span class="text-xs tabular-nums" class:text-gold={ranks.spent > ranks.available} title="Ranks spent / available">{ranks.spent}/{ranks.available} ranks</span>
  {/snippet}
  {#snippet info()}
    <p>Total = ranks + ability modifier + 3 for a class skill with at least one rank + size (Fly, Stealth) + armor check penalty ({app.d.acp}) where marked * + bonuses.</p>
    <p><span class="font-bold text-accent">T</span> skills need at least one rank. In Edit mode, drag ⋮⋮ (or use the arrows) to reorder favorites.</p>
    <BreakdownList
      items={c.skills
        .filter((s) => s.favorite || s.ranks > 0)
        .map((s) => app.d.skills[s.id])
        .filter(Boolean)
        .map((sd) => ({ label: sd.label, total: sd.breakdown }))}
    />
  {/snippet}
  <EditMode>
    {#snippet children(editing)}
      {#if favorites.length}
        <div class="subhead">Favorites</div>
        <table class="dyn-table keep-table skills-table">
          {@render head(true, editing)}
          <tbody use:sortable={{ onmove: moveFavorite }}>
            {#each favorites as e, i (e.id)}{@render row(e, i, true, editing)}{/each}
          </tbody>
        </table>
      {/if}
      <button
        type="button"
        class="subhead mt-1 flex w-full items-center gap-1 text-left"
        aria-expanded={allOpen}
        onclick={() => app.setSection('skills:all', { collapsed: allOpen })}
      >
        <Chevron open={allOpen} class="size-4 print:hidden" /> All skills
      </button>
      <div class:screen-collapsed={!allOpen}>
        <table class="dyn-table keep-table skills-table">
          {@render head(false, editing)}
          <tbody>
            {#each c.skills as e, i (e.id)}{@render row(e, i, false, editing)}{/each}
            <tr class="print-row hidden print:table-row">{#each { length: allMiscZero ? 6 : 7 }, i (i)}<td></td>{/each}</tr>
          </tbody>
        </table>
      </div>
      <p class="text-[0.65rem] opacity-60">
        <sup class="font-bold text-accent">T</sup> trained only · <sup>*</sup> armor check penalty ({app.d.acp}) · class skills with ranks get +3
      </p>
      <div class="print:hidden"><BonusList keys={SKILL_KEYS} label="Skill bonuses" /></div>
    {/snippet}
  </EditMode>
</Section>
