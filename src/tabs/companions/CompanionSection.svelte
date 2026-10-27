<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { ABILITIES, COMPANION_KINDS, CREATURE_TYPES, SIZES, type Companion, type CreatureType, type Save } from '../../lib/model/types';
  import { ANIMAL_INCREASE_LEVELS, CREATURE_PROGRESSION, KIND_LABELS, deriveCompanion } from '../../lib/rules/companions';
  import { companionSectionId, companionTitle, removeCompanion } from '../../lib/companions';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';
  import Stat from '../../lib/ui/Stat.svelte';
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
  const SAVES: [Save, string][] = [
    ['fort', 'Fortitude'],
    ['ref', 'Reflex'],
    ['will', 'Will'],
  ];
  let amount = $state(0);

  /** Changing the creature type resets the good saves to that type's defaults. */
  function setType(t: CreatureType) {
    x.creatureType = t;
    x.goodSaves = [...CREATURE_PROGRESSION[t].goodSaves];
  }
  const toggleSave = (s: Save) => (x.goodSaves = x.goodSaves.includes(s) ? x.goodSaves.filter((g) => g !== s) : [...x.goodSaves, s]);
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
      <p>Animal companions use the druid table: hit dice, natural armor, Str/Dex bonus, bonus tricks and specials follow the effective level (master class level {x.levelMisc ? `${fmt(x.levelMisc)} ` : ''}= {cd.level}). Pick the +1 ability increases at levels 4, 9 and 14 in Edit. Species advancement at 4th or 7th level (size, abilities, attacks) is entered by hand.</p>
    {:else if x.kind === 'familiar'}
      <p>Familiars have half the master's hit points, the master's BAB, the better of their own and the master's base saves, and the master's skill ranks where higher. Natural armor and Intelligence improve with the master's level.</p>
    {:else}
      <p>Hit dice come from the HD field (or the master's level when it's 0). BAB, saves, skill ranks and feats follow the creature type ({CREATURE_PROGRESSION[x.creatureType].label}). Record evolutions and other extras as specials or notes.</p>
    {/if}
    <p>Secondary natural attacks take −5 and add half Str to damage. Hit points use the average roll per hit die.</p>
    <BreakdownList
      items={[
        { label: 'Max HP', total: cd.hp.max, signed: false },
        { label: 'AC', total: cd.ac.normal, signed: false },
        { label: 'Touch AC', total: cd.ac.touch, signed: false },
        { label: 'Flat-footed AC', total: cd.ac.flatFooted, signed: false },
        ...SAVES.map(([s, label]) => ({ label, total: cd.saves[s] })),
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
          <Field label="Master class" class="w-36">
            <Select
              bind:value={x.masterClassId}
              options={[{ value: null, label: 'Character level' }, ...c.classes.map((k) => ({ value: k.id, label: k.name || 'Unnamed' }))]}
              aria-label="Master class"
            />
          </Field>
          <Field label="Level ±" class="w-16"><NumInput bind:value={x.levelMisc} signed aria-label="Level adjustment" title="Boon Companion +4, ranger −3…" /></Field>
          <Field label="Creature type" class="w-36">
            <Select value={x.creatureType} onchange={setType} options={CREATURE_TYPES.map((t) => ({ value: t, label: CREATURE_PROGRESSION[t].label }))} aria-label="Creature type" />
          </Field>
          <div class="field">
            <div class="flex h-7 items-center gap-0.5">
              {#each SAVES as [s] (s)}
                <button
                  type="button"
                  class="rounded-sm border px-1 text-xs uppercase"
                  class:bg-ink={x.goodSaves.includes(s)}
                  class:text-paper={x.goodSaves.includes(s)}
                  aria-pressed={x.goodSaves.includes(s)}
                  aria-label="Good {s} save"
                  onclick={() => toggleSave(s)}>{s[0]}</button
                >
              {/each}
            </div>
            <span class="field-label">Good saves</span>
          </div>
          {#if x.kind === 'eidolon' || x.kind === 'other'}
            <Field label="HD (0 = level)" class="w-24"><NumInput bind:value={x.hd} aria-label="Hit dice" /></Field>
          {/if}
          <Field label="Size" class="w-28"><Select bind:value={x.size} options={opts(SIZES)} aria-label="Companion size" /></Field>
          <Field label="Species" class="w-32"><input bind:value={x.species} placeholder="Wolf, cat…" aria-label="Species" /></Field>
          <Field label="Speed" class="w-32"><input bind:value={x.speed} aria-label="Speed" /></Field>
        </div>
      {/if}
      <p class="text-sm">
        <span class="font-semibold capitalize">{x.species || KIND_LABELS[x.kind]}</span>
        <span class="opacity-70">· {x.size} {CREATURE_PROGRESSION[x.creatureType].label.toLowerCase()} · {cd.hd} HD{x.kind === 'animal' || x.kind === 'familiar' ? ` · level ${cd.level}` : ''} · speed {x.speed || '—'}</span>
      </p>

      <div class="grid items-start gap-3 lg:grid-cols-2 print:grid-cols-2">
        <div class="flex flex-col gap-2">
          <div class="flex items-stretch gap-2">
          <PortraitEditor bind:portrait={x.portrait} name={x.name} class="h-[11.75rem] shrink-0 self-start rounded-sm border border-ink/30" />
          <table class="ability-table compact w-full min-w-0 flex-1 text-center text-sm">
            <thead>
              <tr class="h-5">
                <th></th>
                <th class="text-center">Score</th>
                <th class="text-center">Mod</th>
                <th class="text-center">Temp</th>
                <th class="text-center">Temp mod</th>
                <th class="text-center" title="Temporary change to the score (damage, drain, enhancement…)">±</th>
              </tr>
            </thead>
            <tbody>
              {#each ABILITIES as a (a)}
                {@const s = cd.abilities[a]}
                <tr title={breakdown(s.breakdown)}>
                  <th class="w-11 bg-head py-0.5 text-center text-xs text-head-ink opacity-100" style="print-color-adjust: exact">{a.toUpperCase()}</th>
                  <td class="text-lg font-bold tabular-nums">{s.score}</td>
                  <td class="text-lg font-bold tabular-nums">{fmt(s.mod)}</td>
                  <td class="px-1"><div class="write-box h-6 leading-6 tabular-nums">{s.hasTemp ? s.tempScore : ''}</div></td>
                  <td class="px-1"><div class="write-box h-6 leading-6 tabular-nums">{s.hasTemp ? fmt(s.tempMod) : ''}</div></td>
                  <td class="px-1"><NumInput class="write-box h-6 w-full bg-transparent" bind:value={x.abilities[a].temp} signed aria-label="{x.name || 'Companion'} {a} temporary change" /></td>
                </tr>
              {/each}
            </tbody>
          </table>
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
          {#if editing && x.kind === 'animal'}
            <div class="flex flex-wrap items-end gap-2 print:hidden">
              {#each ANIMAL_INCREASE_LEVELS as lvl, i (lvl)}
                <Field label="Level {lvl} +1" class="w-20">
                  <Select bind:value={x.abilityIncreases[i]} options={[{ value: null, label: '—' }, ...opts(ABILITIES, (a) => a.toUpperCase())]} aria-label="Ability increase at level {lvl}" />
                </Field>
              {/each}
            </div>
          {/if}

          <div class="grid grid-cols-[auto_1fr] items-center gap-2 rounded-sm border border-ink p-1.5">
            <div class="flex min-w-14 flex-col items-center rounded-sm border border-ink/40 px-2 py-0.5" title={breakdown(cd.hp.max)}>
              <span class="text-xl leading-tight font-bold tabular-nums">{cd.hp.max.total}</span>
              <span class="field-label">Max HP</span>
            </div>
            <div class="flex flex-col items-center">
              <input
                class="h-9 w-full border-0 bg-transparent text-center text-3xl leading-none font-bold tabular-nums print:invisible"
                class:text-accent={cd.hp.current <= cd.hp.max.total / 4}
                inputmode="numeric"
                aria-label="{x.name || 'Companion'} current hit points"
                value={cd.hp.current}
                onchange={(e) => {
                  const v = Number(e.currentTarget.value);
                  if (Number.isFinite(v)) x.hp.damage = cd.hp.max.total + x.hp.temp - v;
                  e.currentTarget.value = String(cd.hp.current);
                }}
              />
              <span class="field-label">Current HP</span>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1 print:hidden">
            <NumInput class="w-12" bind:value={amount} aria-label="Damage or healing amount" />
            <button type="button" class="btn" onclick={() => ((x.hp.damage += amount), (amount = 0))}>Damage</button>
            <button type="button" class="btn" onclick={() => ((x.hp.damage = Math.max(0, x.hp.damage - amount)), (amount = 0))}>Heal</button>
            <label class="ml-auto flex items-center gap-1"><span class="field-label">Temp</span><NumInput class="w-12" bind:value={x.hp.temp} aria-label="Temporary hit points" /></label>
          </div>

          <div class="group-box group-box-dark grid grid-cols-3 gap-1">
            <Stat label="AC" value={cd.ac.normal} signed={false} size="md" />
            <Stat label="Touch" value={cd.ac.touch} signed={false} />
            <Stat label="Flat-footed" value={cd.ac.flatFooted} signed={false} />
          </div>
          <div class="group-box group-box-dark grid grid-cols-3 gap-1">
            {#each SAVES as [s, label] (s)}<Stat {label} value={cd.saves[s]} size="md" />{/each}
          </div>
          <div class="grid grid-cols-4 gap-1">
            <Stat label="BAB" value={cd.bab} />
            <Stat label="CMB" value={cd.cmb} />
            <Stat label="CMD" value={cd.cmd} signed={false} />
            <Stat label="Init" value={cd.init} />
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
              <td data-label="Bonus" class="w-12 text-center align-middle font-bold tabular-nums" title={ad ? breakdown(ad.attack) : ''}>{ad ? fmt(ad.attack.total) : ''}</td>
              <td data-label="Damage" class="w-28 align-middle">
                <div class="flex items-center gap-0.5">
                  <input class="w-16 min-w-0" bind:value={a.damage} placeholder="1d6" aria-label="Damage dice" />
                  {#if ad && ad.damageBonus}<span class="font-bold whitespace-nowrap tabular-nums">{fmt(ad.damageBonus)}</span>{/if}
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
                {#if editing}<Select class="h-6 w-full text-xs" bind:value={sk.ability} options={opts(ABILITIES, (a) => a.toUpperCase())} aria-label="{sk.name} ability" />{:else}<span class="opacity-60">{sk.ability}</span>{/if}
              </td>
              <td data-label="Total" class="cell-fit w-12 text-center align-middle font-bold tabular-nums" title={sd ? breakdown(sd.total) : ''}>{sd ? fmt(sd.total.total) : ''}</td>
              <td data-label="Ranks" class="cell-fit w-14 align-middle">
                <NumInput class="h-6" bind:value={sk.ranks} aria-label="{sk.name} ranks" title={sd && sd.ranks > sk.ranks ? `Using the master's ${sd.ranks} ranks` : undefined} />
              </td>
              {#if editing}<td data-label="Misc" class="cell-fit w-14 align-middle"><NumInput class="h-6" bind:value={sk.misc} signed aria-label="{sk.name} misc" /></td>{/if}
            {/snippet}
          </DynamicTable>

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
