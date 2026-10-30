<script lang="ts">
  import { partsOf } from '../../lib/dice/roll';
  import { rollable } from '../../lib/dice/rollable';
  import { roll } from '../../lib/dice/rolls.svelte';
  import { damageNotation } from '../../lib/dice/notation';
  import { make } from '../../lib/model/defaults';
  import { ABILITIES, COMPANION_KINDS, CREATURE_TYPES, EIDOLON_BASE_FORMS, SAVES, SAVE_NAMES, SIZES, type Companion, type CreatureType } from '../../lib/model/types';
  import { CREATURE_PROGRESSION, KIND_LABELS, deriveCompanion } from '../../lib/rules/companions';
  import { COMPANION_LABELS, DRAKE_POWERS, DRAKE_SUBTYPES, EIDOLON_BASE_FORMS as BASE_FORMS, EIDOLON_SUBTYPES, PHANTOM_FOCI } from '../../lib/rules/companionTables';
  import type { DbCompanion } from '../../lib/db/types';
  import Combobox from '../../lib/ui/Combobox.svelte';
  import DbPicker from '../../lib/ui/DbPicker.svelte';
  import { companionSectionId, companionTitle, removeCompanion } from '../../lib/companions';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';
  import { ABILITY_OPTIONS, classOptions } from '../../lib/ui/options';
  import Stat from '../../lib/ui/Stat.svelte';
  import AbilityTable from '../../lib/ui/AbilityTable.svelte';
  import HpBox from '../../lib/ui/HpBox.svelte';
  import DefenseStats from '../../lib/ui/DefenseStats.svelte';
  import SaveToggles from '../../lib/ui/SaveToggles.svelte';
  import PortraitEditor from '../../lib/ui/PortraitEditor.svelte';
  import Chips from '../../lib/ui/Chips.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';
  import { breakdown, fmt } from '../../lib/ui/format';

  interface Props {
    comp: Companion;
  }
  let { comp: x }: Props = $props();

  const c = $derived(app.char);
  const cd = $derived(deriveCompanion(c, app.d, x));
  const who = $derived(x.name || 'Companion');
  let amount = $state(0);

  /** Changing the creature type resets the good saves to that type's defaults. */
  function setType(t: CreatureType) {
    x.creatureType = t;
    x.goodSaves = [...CREATURE_PROGRESSION[t].goodSaves];
  }
  /** A phantom's emotional focus fixes its good saves. */
  function setFocus(f: string) {
    x.phantom.focus = f;
    const focus = PHANTOM_FOCI[f];
    if (focus) x.goodSaves = [...focus.goodSaves];
  }
  /** Copy an eidolon base form's starting statistics (one-shot, like picking from the database). */
  function applyBaseForm() {
    const f = x.eidolon.baseForm ? BASE_FORMS[x.eidolon.baseForm] : undefined;
    if (!f) return;
    x.size = f.size;
    x.speed = f.speed;
    x.naturalArmor = f.natural;
    x.goodSaves = [...f.goodSaves];
    for (const a of ABILITIES) x.abilities[a].base = f.abilities[a];
    x.attacks = f.attacks.map((a) => ({ ...make.companionAttack(), ...a }));
  }
  /** Fill the companion from a bundled species stat block. */
  function applySpecies(e: DbCompanion) {
    x.species = e.name;
    x.size = (SIZES as readonly string[]).includes(e.size) ? (e.size as Companion['size']) : x.size;
    if (e.speed) x.speed = e.speed;
    x.naturalArmor = e.naturalArmor;
    for (const a of ABILITIES) x.abilities[a].base = e.abilities[a];
    x.attacks = e.attacks.map((a) => ({ ...make.companionAttack(), name: a.name, damage: a.damage, primary: !a.secondary }));
    x.special = [...new Set([...x.special, ...e.special])];
    if (e.advancement && !x.notes.includes(e.advancement)) x.notes = [x.notes.trim(), e.advancement].filter(Boolean).join('\n');
  }
  const sizeText = $derived(cd.size === x.size ? x.size : `${cd.size} (grown from ${x.size})`);
  // Special abilities from the progression table (the user's own are edited as chips).
  const tableSpecial = $derived(cd.special.filter((s) => !x.special.includes(s)));
</script>

<Section id={companionSectionId(x)} title={companionTitle(x)} editable>
  {#snippet editActions()}
    <button type="button" class="head-btn" title="Remove this companion" onclick={() => removeCompanion(c, x.id)}>Remove</button>
  {/snippet}
  {#snippet info()}
    <p>{cd.source}.</p>
    {#if x.kind === 'animal'}
      <p>Animal companions use the druid table: hit dice, natural armor, Str/Dex bonus, bonus tricks and specials follow the effective level (master class level {x.levelMisc ? `${fmt(x.levelMisc)} ` : ''}= {cd.level}). The same table serves mounts (cavalier, samurai, paladin divine bond), plant, vermin and monstrous companions; set Level ± for Boon Companion (+4) or a ranger's −3. Pick the +1 ability increases at levels 4, 9 and 14 in Edit. Species advancement at 4th or 7th level (size, abilities, attacks) is entered by hand; the species picker adds it to the notes.</p>
    {:else if x.kind === 'familiar'}
      <p>Familiars (and shaman spirit animals) have half the master's hit points, the master's BAB, the better of their own and the master's base saves, and the master's skill ranks where higher. Natural armor and Intelligence improve with the master's level.</p>
    {:else if x.kind === 'eidolon'}
      <p>Eidolons follow the summoner's table: hit dice, BAB (= HD), good saves (two, by base form), 4 skill ranks per HD, feats, armor bonus (natural), Str/Dex bonus, evolution pool and maximum natural attacks. Unchained eidolons get the smaller pool and a subtype. Apply a base form once, then spend the pool on evolutions.</p>
    {:else if x.kind === 'phantom'}
      <p>Phantoms follow the spiritualist's table: hit dice, BAB (= HD), 2 skill ranks per HD, feats, armor bonus and Dex/Cha bonus. The emotional focus sets the good saves and two skills. Ectoplasmic form turns the armor bonus into natural armor with damage reduction; incorporeal form makes it a deflection bonus plus the Charisma modifier and lets the phantom fly from 9th level. Slams: {cd.naturalDamage}.</p>
    {:else if x.kind === 'drake'}
      <p>Drakes follow the charge's level (ranger drake warden: level −3): d12 hit dice, BAB (= HD), all saves good, 3 skill ranks per HD, natural armor +2 at 3rd and every three levels, one size larger at 5th, 9th, 13th and 17th (+4 Str, −2 Dex, +2 Con, +2 natural armor each), +1 to an ability at 5th, 10th, 15th and 20th, and a drake power at 3rd, 7th, 11th, 15th and 19th plus the subtype's free power.</p>
    {:else}
      <p>Hit dice come from the HD field (or the master's level when it's 0). BAB, saves, skill ranks and feats follow the creature type ({CREATURE_PROGRESSION[x.creatureType].label}). Cohorts from Leadership are full characters: build them as a separate character in the roster.</p>
    {/if}
    <p>Secondary natural attacks take −5 and add half Str to damage. Hit points use the average roll per hit die.</p>
    <BreakdownList
      items={[
        { label: 'Max HP', total: cd.hp.max, signed: false },
        { label: 'AC', total: cd.ac.normal, signed: false },
        { label: 'Touch AC', total: cd.ac.touch, signed: false },
        { label: 'Flat-footed AC', total: cd.ac.flatFooted, signed: false },
        ...SAVES.map((s) => ({ label: SAVE_NAMES[s], total: cd.saves[s] })),
        { label: 'CMB', total: cd.cmb },
        { label: 'CMD', total: cd.cmd, signed: false },
        ...x.attacks.filter((a) => cd.attacks[a.id]).map((a) => ({ label: a.name || 'Attack', total: cd.attacks[a.id].attack })),
      ]}
    />
  {/snippet}
  <EditMode>
    {#snippet children(editing)}
      {#if editing}
        <div class="flex flex-wrap items-end gap-2 print:hidden">
          <Field label="Name" class="w-36"><input class="font-semibold" bind:value={x.name} aria-label="Companion name" /></Field>
          <Field label="Kind" class="w-40"><Select bind:value={x.kind} options={COMPANION_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))} aria-label="Kind" /></Field>
          <Field label="Label" class="w-32"><Combobox bind:value={x.label} suggestions={COMPANION_LABELS[x.kind] ?? []} placeholder="Mount…" aria-label="Companion label" /></Field>
          <Field label="Master class" class="w-36">
            <Select
              bind:value={x.masterClassId}
              options={classOptions(c.classes, { value: null, label: 'Character level' })}
              aria-label="Master class"
            />
          </Field>
          <Field label="Level ±" class="w-16"><NumInput bind:value={x.levelMisc} signed aria-label="Level adjustment" title="Boon Companion +4, ranger −3…" /></Field>
          <Field label="Creature type" class="w-36">
            <Select value={x.creatureType} onchange={setType} options={CREATURE_TYPES.map((t) => ({ value: t, label: CREATURE_PROGRESSION[t].label }))} aria-label="Creature type" />
          </Field>
          <div class="field">
            <div class="flex h-7 items-center gap-0.5"><SaveToggles bind:saves={x.goodSaves} /></div>
            <span class="field-label">Good saves</span>
          </div>
          {#if x.kind !== 'familiar'}
            <Field label="HD (0 = table)" class="w-24"><NumInput bind:value={x.hd} aria-label="Hit dice" /></Field>
          {/if}
          <Field label="Size" class="w-28"><Select bind:value={x.size} options={opts(SIZES)} aria-label="Companion size" /></Field>
          <Field label="Species" class="w-32"><input bind:value={x.species} placeholder="Wolf, cat…" aria-label="Species" /></Field>
          <Field label="Speed" class="w-32"><input bind:value={x.speed} aria-label="Speed" /></Field>
          {#if x.kind === 'animal' || x.kind === 'familiar'}
            <DbPicker kind="companions" label="Find species" filter={(e) => e.kind === x.kind} onpick={applySpecies}>
              {#snippet detail(e)}{e.size} · {e.speed || '—'} · Str {e.abilities.str} Dex {e.abilities.dex} Con {e.abilities.con} · {e.attacks.map((a) => `${a.name} ${a.damage}`).join(', ') || 'no attacks'}{/snippet}
            </DbPicker>
          {/if}
        </div>
        {#if x.kind === 'eidolon'}
          <div class="flex flex-wrap items-end gap-2 print:hidden">
            <label class="flex h-7 items-center gap-1 text-sm"><input type="checkbox" bind:checked={x.eidolon.unchained} /> Unchained</label>
            {#if x.eidolon.unchained}
              <Field label="Subtype" class="w-32"><Combobox bind:value={x.eidolon.subtype} suggestions={EIDOLON_SUBTYPES} placeholder="Angel…" aria-label="Eidolon subtype" /></Field>
            {/if}
            <Field label="Base form" class="w-32">
              <Select bind:value={x.eidolon.baseForm} options={[{ value: '' as const, label: '—' }, ...opts(EIDOLON_BASE_FORMS)]} aria-label="Base form" />
            </Field>
            <button type="button" class="btn" disabled={!x.eidolon.baseForm} title="Copy the base form's size, speed, saves, attacks and ability scores" onclick={applyBaseForm}>Apply base form</button>
            <Field label="Pool ±" class="w-16"><NumInput bind:value={x.eidolon.poolMisc} signed aria-label="Evolution pool adjustment" title="Extra Evolution feat…" /></Field>
          </div>
        {:else if x.kind === 'phantom'}
          <div class="flex flex-wrap items-end gap-2 print:hidden">
            <Field label="Emotional focus" class="w-36">
              <Select value={x.phantom.focus} onchange={setFocus} options={[{ value: '', label: '—' }, ...opts(Object.keys(PHANTOM_FOCI))]} aria-label="Emotional focus" />
            </Field>
            <Field label="Form" class="w-32">
              <Select bind:value={x.phantom.form} options={opts(['ectoplasmic', 'incorporeal'] as const)} aria-label="Manifested form" />
            </Field>
          </div>
        {:else if x.kind === 'drake'}
          <div class="flex flex-wrap items-end gap-2 print:hidden">
            <Field label="Subtype" class="w-32"><Select bind:value={x.drake.subtype} options={[{ value: '', label: '—' }, ...opts(DRAKE_SUBTYPES)]} aria-label="Drake subtype" /></Field>
          </div>
        {/if}
      {/if}
      <p class="text-sm">
        <span class="font-semibold capitalize">{x.species || KIND_LABELS[x.kind]}</span>
        <span class="opacity-70">· {sizeText} {CREATURE_PROGRESSION[x.creatureType].label.toLowerCase()} · {cd.hd} HD{x.kind !== 'other' ? ` · level ${cd.level}` : ''} · speed {x.speed || '—'}{cd.naturalDamage ? ` · slam ${cd.naturalDamage}` : ''}{x.kind === 'phantom' ? ` · ${x.phantom.form}` : ''}</span>
      </p>
      {#if cd.pool}
        <div class="flex flex-wrap items-center gap-x-3 text-sm">
          <span><span class="field-label">Evolution pool</span> <strong class:text-accent={cd.pool.spent > cd.pool.total}>{cd.pool.spent}/{cd.pool.total}</strong></span>
          <span><span class="field-label">Max attacks</span> <strong class:text-accent={x.attacks.length > (cd.maxAttacks ?? 99)}>{x.attacks.length}/{cd.maxAttacks}</strong></span>
          {#if cd.freeEvolutions.length}<span class="opacity-70">free: {cd.freeEvolutions.join(', ')}</span>{/if}
        </div>
      {/if}
      {#if cd.powers !== null}
        <div class="text-sm"><span class="field-label">Drake powers</span> <strong class:text-accent={x.drake.powers.length > cd.powers}>{x.drake.powers.length}/{cd.powers}</strong></div>
      {/if}

      <div class="grid items-start gap-3 lg:grid-cols-2 print:grid-cols-2">
        <div class="flex flex-col gap-2">
          <div class="flex items-stretch gap-2">
          <PortraitEditor bind:portrait={x.portrait} name={x.name} class="h-[11.75rem] shrink-0 self-start rounded-sm border border-ink/30" />
          <AbilityTable abilities={cd.abilities} scores={x.abilities} owner={who} compact />
          </div>
          {#if editing}
            <div class="grid grid-cols-[auto_repeat(6,minmax(0,1fr))] items-center gap-x-1 gap-y-0.5 text-xs print:hidden">
              <span></span>
              {#each ABILITIES as a (a)}<span class="field-label text-center">{a}</span>{/each}
              <span class="field-label">Base</span>
              {#each ABILITIES as a (a)}<NumInput bind:value={x.abilities[a].base} aria-label="{a} base" />{/each}
              <span class="field-label">Misc</span>
              {#each ABILITIES as a (a)}<NumInput bind:value={x.abilities[a].misc} signed aria-label="{a} misc" />{/each}
            </div>
          {/if}
          {#if editing && cd.increaseLevels.length}
            <div class="flex flex-wrap items-end gap-2 print:hidden">
              {#each cd.increaseLevels as lvl, i (lvl)}
                <Field label="Level {lvl} +1" class="w-20">
                  <Select bind:value={x.abilityIncreases[i]} options={[{ value: null, label: '—' }, ...ABILITY_OPTIONS]} aria-label="Ability increase at level {lvl}" />
                </Field>
              {/each}
            </div>
          {/if}

          <HpBox max={cd.hp.max} current={cd.hp.current} hp={x.hp} owner={who} compact />
          <div class="flex flex-wrap items-center gap-1 print:hidden">
            <NumInput class="w-12" bind:value={amount} aria-label="Damage or healing amount" />
            <button type="button" class="btn" onclick={() => ((x.hp.damage += amount), (amount = 0))}>Damage</button>
            <button type="button" class="btn" onclick={() => ((x.hp.damage = Math.max(0, x.hp.damage - amount)), (amount = 0))}>Heal</button>
            <label class="ml-auto flex items-center gap-1"><span class="field-label">Temp</span><NumInput class="w-12" bind:value={x.hp.temp} aria-label="Temporary hit points" /></label>
          </div>

          <DefenseStats ac={cd.ac} saves={cd.saves} subtitle={who} />
          <div class="grid grid-cols-4 gap-1">
            <Stat label="BAB" value={cd.bab} />
            <Stat label="CMB" value={cd.cmb} roll={{ title: 'Combat maneuver', subtitle: who }} />
            <Stat label="CMD" value={cd.cmd} signed={false} />
            <Stat label="Init" value={cd.init} roll={{ title: 'Initiative', subtitle: who }} />
          </div>
          {#if editing}
            <div class="grid grid-cols-4 gap-2 sm:grid-cols-7 print:hidden">
              <Field label="Natural"><NumInput bind:value={x.naturalArmor} signed aria-label="Species natural armor" /></Field>
              <Field label="Armor"><NumInput bind:value={x.armorBonus} signed aria-label="Armor or barding bonus" /></Field>
              <Field label="AC misc"><NumInput bind:value={x.acMisc} signed /></Field>
              <Field label="Fort misc"><NumInput bind:value={x.saveMisc.fort} signed /></Field>
              <Field label="Ref misc"><NumInput bind:value={x.saveMisc.ref} signed /></Field>
              <Field label="Will misc"><NumInput bind:value={x.saveMisc.will} signed /></Field>
              <Field label="HP misc"><NumInput bind:value={x.hpMisc} signed /></Field>
            </div>
          {/if}
        </div>

        <div class="flex flex-col gap-2">
          <div class="subhead">Attacks</div>
          <DynamicTable bind:items={x.attacks} cols={editing ? 6 : 4} onadd={() => x.attacks.push(make.companionAttack())} addLabel="Attack" empty="Bite, claws, slam…">
            {#snippet head()}
              <th>Attack</th>
              {#if editing}<th title="Primary natural attack">Pri</th><th title="Weapon Finesse (Dex to hit)">Fin</th>{/if}
              <th class="text-center">Bonus</th>
              <th>Damage</th>
              <th>Notes</th>
            {/snippet}
            {#snippet row(a)}
              {@const ad = cd.attacks[a.id]}
              <td data-label="Attack" class="min-w-24 align-middle">
                <input class="w-full font-semibold" bind:value={a.name} aria-label="Attack name" />
                {#if !editing && !a.primary}<span class="text-[0.6rem] uppercase opacity-60">secondary</span>{/if}
              </td>
              {#if editing}
                <td data-label="Pri" class="w-8 text-center align-middle"><input type="checkbox" bind:checked={a.primary} aria-label="Primary attack" /></td>
                <td data-label="Fin" class="w-8 text-center align-middle"><input type="checkbox" bind:checked={a.finesse} aria-label="Weapon Finesse" /></td>
              {/if}
              <td data-label="Bonus" class="w-12 text-center align-middle font-bold tabular-nums" title={ad ? breakdown(ad.attack) : ''}>
                {#if ad}<span use:rollable={{ title: `${a.name || 'Attack'} attack`, subtitle: who, bonus: ad.attack.total, parts: partsOf(ad.attack) }}>{fmt(ad.attack.total)}</span>{/if}
              </td>
              <td data-label="Damage" class="w-28 align-middle">
                <div class="flex items-center gap-0.5">
                  <input class="w-16 min-w-0" bind:value={a.damage} placeholder="1d6" aria-label="Damage dice" />
                  {#if ad && ad.damageBonus}<span class="font-bold whitespace-nowrap tabular-nums">{fmt(ad.damageBonus)}</span>{/if}
                  {#if ad}
                    <button
                      type="button"
                      class="icon-btn size-5 text-xs print:hidden"
                      title="Roll damage"
                      aria-label="Roll {a.name || 'attack'} damage"
                      onclick={() => {
                        const n = damageNotation(a.damage, ad.damageBonus);
                        if (n) void roll({ title: `${a.name || 'Attack'} damage`, subtitle: who, notation: n, parts: ad.damageBonus ? [{ source: 'Damage bonus', value: ad.damageBonus }] : [] });
                        else app.notify('Enter damage dice (e.g. 1d6) to roll.');
                      }}>⚄</button
                    >
                  {/if}
                </div>
              </td>
              <td data-label="Notes" class="align-middle"><input class="w-full" bind:value={a.notes} placeholder="trip, grab…" aria-label="Notes" /></td>
            {/snippet}
          </DynamicTable>
          {#if editing}
            <div class="flex flex-wrap gap-2 print:hidden">
              {#each x.attacks as a (a.id)}
                <Field label="{a.name || 'Attack'} misc atk / dmg" class="w-40">
                  <div class="flex gap-1">
                    <NumInput bind:value={a.attackMisc} signed aria-label="{a.name} attack misc" />
                    <NumInput bind:value={a.damageMisc} signed aria-label="{a.name} damage misc" />
                  </div>
                </Field>
              {/each}
            </div>
          {/if}

          <div class="subhead flex justify-between">
            <span>Skills</span>
            {#if cd.skillRanks.available !== null}
              <span class="font-sans text-xs font-normal tracking-normal normal-case" class:text-gold={cd.skillRanks.spent > cd.skillRanks.available}>{cd.skillRanks.spent}/{cd.skillRanks.available} ranks</span>
            {:else}
              <span class="font-sans text-xs font-normal tracking-normal normal-case opacity-70">uses the master's ranks where higher</span>
            {/if}
          </div>
          <DynamicTable bind:items={x.skills} cols={editing ? 6 : 5} onadd={() => x.skills.push(make.companionSkill())} addLabel="Skill" empty="No skills.">
            {#snippet head()}
              <th title="Class skill">CS</th>
              <th>Skill</th>
              <th class="text-center">Abil</th>
              <th class="text-center">Total</th>
              <th class="text-center">Ranks</th>
              {#if editing}<th class="text-center">Misc</th>{/if}
            {/snippet}
            {#snippet row(sk)}
              {@const sd = cd.skills[sk.id]}
              <td data-label="CS" class="cell-fit w-6 text-center align-middle"><input type="checkbox" bind:checked={sk.classSkill} aria-label="{sk.name} is a class skill" /></td>
              <td data-label="Skill" class="cell-grow align-middle"><input class="w-full" bind:value={sk.name} aria-label="Skill name" /></td>
              <td data-label="Abil" class="cell-fit w-16 text-center align-middle text-xs uppercase">
                {#if editing}<Select class="h-6 w-full text-xs" bind:value={sk.ability} options={ABILITY_OPTIONS} aria-label="{sk.name} ability" />{:else}<span class="opacity-60">{sk.ability}</span>{/if}
              </td>
              <td data-label="Total" class="cell-fit w-12 text-center align-middle font-bold tabular-nums" title={sd ? breakdown(sd.total) : ''}>{sd ? fmt(sd.total.total) : ''}</td>
              <td data-label="Ranks" class="cell-fit w-14 align-middle">
                <NumInput class="h-6" bind:value={sk.ranks} aria-label="{sk.name} ranks" title={sd && sd.ranks > sk.ranks ? `Using the master's ${sd.ranks} ranks` : undefined} />
              </td>
              {#if editing}<td data-label="Misc" class="cell-fit w-14 align-middle"><NumInput class="h-6" bind:value={sk.misc} signed aria-label="{sk.name} misc" /></td>{/if}
            {/snippet}
          </DynamicTable>

          {#if x.kind === 'eidolon'}
            <div class="subhead">Evolutions</div>
            <DynamicTable bind:items={x.eidolon.evolutions} cols={3} onadd={() => x.eidolon.evolutions.push(make.evolution())} addLabel="Evolution" empty="Spend the pool on evolutions.">
              {#snippet head()}
                <th>Evolution</th>
                <th class="text-center" title="Evolution points">EP</th>
                <th>Notes</th>
              {/snippet}
              {#snippet row(ev)}
                <td data-label="Evolution" class="cell-grow align-middle"><input class="w-full font-semibold" bind:value={ev.name} aria-label="Evolution name" /></td>
                <td data-label="EP" class="cell-fit w-12 align-middle"><NumInput class="h-6" bind:value={ev.cost} aria-label="{ev.name} cost" /></td>
                <td data-label="Notes" class="align-middle"><input class="w-full" bind:value={ev.notes} placeholder="claws, +2 Str…" aria-label="Notes" /></td>
              {/snippet}
              {#snippet tools()}
                <DbPicker kind="evolutions" label="Find evolution" onpick={(e) => x.eidolon.evolutions.push({ ...make.evolution(), name: e.name, cost: e.cost })}>
                  {#snippet detail(e)}{e.cost} EP · {e.summary}{/snippet}
                </DbPicker>
              {/snippet}
            </DynamicTable>
          {:else if x.kind === 'drake'}
            <div class="flex flex-col">
              <span class="field-label">Drake powers</span>
              <Chips bind:items={x.drake.powers} suggestions={DRAKE_POWERS} placeholder="Add power…" label="Add drake power" />
            </div>
          {/if}
          <div class="flex flex-col">
            <span class="field-label">Feats{cd.feats !== null ? ` (${x.feats.length}/${cd.feats})` : ''}</span>
            <Chips bind:items={x.feats} placeholder="Add feat…" label="Add feat" />
          </div>
          {#if x.creatureType === 'animal' || x.tricks.length}
            <div class="flex flex-col">
              <span class="field-label">Tricks{cd.tricks.known !== null ? ` (${x.tricks.length}/${cd.tricks.known})` : ''}{cd.tricks.bonus ? ` · ${cd.tricks.bonus} bonus` : ''}</span>
              <Chips bind:items={x.tricks} placeholder="Add trick…" label="Add trick" />
            </div>
          {/if}
          <div class="flex flex-col gap-1">
            <span class="field-label">Special abilities</span>
            {#if tableSpecial.length}
              <div class="flex flex-wrap gap-1">{#each tableSpecial as s, i (i)}<span class="chip">{s}</span>{/each}</div>
            {/if}
            <Chips bind:items={x.special} placeholder="Add special…" label="Add special ability" />
          </div>
          <Field label="Notes"><textarea rows="2" bind:value={x.notes} aria-label="Companion notes"></textarea></Field>
        </div>
      </div>
    {/snippet}
  </EditMode>
</Section>
