<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import type { SkillEntry } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import { isClassSkill } from '../../lib/rules/skills';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';
  import { breakdown, fmt } from '../../lib/ui/format';
  import { BONUS_KEYS } from '../../lib/rules/keys';

  const SKILL_KEYS = BONUS_KEYS.filter((k) => k.key.startsWith('skill')).map((k) => k.key);

  const c = $derived(app.char);
  const favorites = $derived(c.skills.filter((s) => s.favorite));
  const ranks = $derived(app.d.skillRanks);

  function addSubtype(e: SkillEntry) {
    // Insert after the last row of the same skill.
    const last = c.skills.findLastIndex((s) => s.skill === e.skill);
    c.skills.splice(last + 1, 0, make.skill(e.skill, ''));
  }

  function removeRow(e: SkillEntry) {
    c.skills.splice(c.skills.indexOf(e), 1);
  }

  function toggleClassSkill(e: SkillEntry, checked: boolean) {
    const fromClass = isClassSkill(app.d.classSkills, e.skill, e.subtype);
    // Store an override only when it differs from the class list.
    if (checked === fromClass) delete e.classSkill;
    else e.classSkill = checked;
  }

  const siblings = (e: SkillEntry) => c.skills.filter((s) => s.skill === e.skill).length;
</script>

{#snippet row(e: SkillEntry, inFavorites: boolean)}
  {@const sd = app.d.skills[e.id]}
  {#if sd}
    <tr class:opacity-50={sd.unusable}>
      <td class="w-5 text-center">
        <button
          type="button"
          class={['text-base leading-none', e.favorite ? 'text-gold' : 'opacity-30 print:hidden']}
          aria-pressed={e.favorite}
          aria-label="{e.favorite ? 'Unfavorite' : 'Favorite'} {sd.label}"
          onclick={() => (e.favorite = !e.favorite)}>★</button
        >
      </td>
      <td class="w-5 text-center">
        <input
          type="checkbox"
          aria-label="{sd.label} is a class skill"
          checked={sd.classSkill}
          onchange={(ev) => toggleClassSkill(e, ev.currentTarget.checked)}
        />
      </td>
      <td class="w-full">
        <div class="flex items-center gap-1">
          <span class="whitespace-nowrap max-sm:text-sm">
            {sd.def.name}{#if sd.def.trainedOnly}<sup title="Trained only" class="ml-0.5 font-bold text-accent">T</sup>{/if}{#if sd.def.acp}<sup title="Armor check penalty applies" class="ml-0.5">*</sup>{/if}
          </span>
          {#if sd.def.multi}
            {#if inFavorites}
              <span class="truncate text-sm">({e.subtype})</span>
            {:else}
              <input class="w-full min-w-12 flex-1 text-sm" bind:value={e.subtype} placeholder="type" aria-label="{sd.def.name} type" />
            {/if}
          {/if}
        </div>
      </td>
      <td class="text-center text-xs uppercase opacity-60">{sd.def.ability}</td>
      <td class="text-center font-bold tabular-nums" title={breakdown(sd.breakdown)}>{fmt(sd.total)}</td>
      <td class="w-9"><NumInput bind:value={e.ranks} aria-label="{sd.label} ranks" /></td>
      <td class="w-9"><NumInput bind:value={e.misc} signed aria-label="{sd.label} misc" /></td>
      <td class="w-6 print:hidden">
        {#if sd.def.multi && !inFavorites && siblings(e) > 1}
          <button type="button" class="icon-btn text-accent" aria-label="Remove {sd.label}" onclick={() => removeRow(e)}>✕</button>
        {/if}
      </td>
    </tr>
    {#if sd.def.multi && !inFavorites && c.skills.findLast((s) => s.skill === e.skill) === e}
      <tr class="print:hidden">
        <td colspan="8" class="py-0 pl-12">
          <button type="button" class="text-xs underline opacity-70 hover:opacity-100" onclick={() => addSubtype(e)}>+ another {sd.def.name}</button>
        </td>
      </tr>
    {/if}
  {/if}
{/snippet}

{#snippet head()}
  <thead>
    <tr>
      <th title="Favorite"><span class="sr-only">Favorite</span>★</th>
      <th title="Class skill">CS</th>
      <th>Skill</th>
      <th class="text-center">Abil</th>
      <th class="text-center">Total</th>
      <th class="text-center">Ranks</th>
      <th class="text-center">Misc</th>
      <th class="print:hidden"></th>
    </tr>
  </thead>
{/snippet}

<Section id="skills">
  {#snippet actions()}
    <span class="text-xs tabular-nums" class:text-gold={ranks.spent > ranks.available} title="Ranks spent / available">
      {ranks.spent}/{ranks.available} ranks
    </span>
  {/snippet}

  {#if favorites.length}
    <div class="subhead">Favorites</div>
    <table class="dyn-table">
      {@render head()}
      <tbody>
        {#each favorites as e (e.id)}{@render row(e, true)}{/each}
      </tbody>
    </table>
    <div class="subhead mt-1">All skills</div>
  {/if}
  <table class="dyn-table">
    {@render head()}
    <tbody>
      {#each c.skills as e (e.id)}{@render row(e, false)}{/each}
      <tr class="print-row hidden print:table-row">{#each { length: 7 }, i (i)}<td></td>{/each}</tr>
    </tbody>
  </table>
  <p class="text-[0.65rem] opacity-60">
    <sup class="font-bold text-accent">T</sup> trained only · <sup>*</sup> armor check penalty ({app.d.acp}) · class skills with ranks get +3
  </p>
  <div class="print:hidden"><BonusList keys={SKILL_KEYS} label="Skill bonuses" /></div>
</Section>
