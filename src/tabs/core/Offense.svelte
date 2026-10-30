<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { ABILITIES } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Stat from '../../lib/ui/Stat.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import DynamicList from '../../lib/ui/DynamicList.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';
  import { breakdown, fmt } from '../../lib/ui/format';
  import { rollable } from '../../lib/dice/rollable';
  import DbPicker from '../../lib/ui/DbPicker.svelte';
  import type { DbItem } from '../../lib/db/types';
  import { parseGp } from '../../lib/model/migrate';
  import { iterativeText } from '../../lib/rules/tables';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';
  import Iterative from '../../lib/ui/Iterative.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';
  import { partsOf } from '../../lib/dice/roll';
  import { roll } from '../../lib/dice/rolls.svelte';
  import { critMultiplier, damageNotation, multiplyNotation, parseNotation, formatNotation } from '../../lib/dice/notation';
  import type { Weapon } from '../../lib/model/types';
  import type { WeaponDerived } from '../../lib/rules/derive';
  import { splitCrit } from '../../lib/model/crit';

  function addWeapon(it: DbItem) {
    const w = it.weapon!;
    const ranged = w.handedness === 'ranged';
    c.weapons.push({
      ...make.weapon(),
      name: it.name,
      kind: ranged ? 'ranged' : 'melee',
      attackAbility: ranged ? 'dex' : 'str',
      damageAbility: ranged ? 'none' : 'str',
      damageMultiplier: w.handedness === 'two-handed' ? 1.5 : 1,
      damage: w.damage,
      ...splitCrit(w.crit),
      range: w.range,
      type: w.type,
      weight: it.weight,
      price: parseGp(it.price),
    });
  }

  const c = $derived(app.char);
  const d = $derived(app.d);

  const KEYS = ['attack', 'attack.melee', 'attack.ranged', 'damage', 'damage.melee', 'damage.ranged', 'cmb'];

  const weaponName = (w: Weapon) => w.name || 'Weapon';
  function rollDamage(w: Weapon, wd: WeaponDerived, crit = false) {
    const notation = damageNotation(wd.damageDice, wd.damageBonus);
    if (!notation) return app.notify(`Enter dice for ${weaponName(w)} (e.g. 1d8) to roll damage.`);
    const times = crit ? critMultiplier(w.crit) : 1;
    const n = parseNotation(notation)!;
    // "dice" mode rolls the multiplied dice; "total" mode rolls normally and multiplies the result.
    const byDice = crit && app.char.critMode === 'dice';
    void roll({
      title: `${weaponName(w)} ${crit ? `critical ×${times}` : 'damage'}`,
      notation: formatNotation(byDice ? multiplyNotation(n, times) : n),
      parts: partsOf(wd.damageBreakdown).map((p) => (byDice ? { ...p, value: p.value * times } : p)),
      multiplier: crit && !byDice ? times : 1,
      // Extra dice (Flaming, sneak attack…) aren't multiplied on a critical.
      extras: wd.extraDamage.map((x) => ({ label: x.type, notation: x.notation })),
    });
  }
</script>

<Section id="offense" editable>
  {#snippet info()}
    <BreakdownList
      items={[
        { label: 'BAB', total: { total: d.bab, parts: [] } },
        { label: 'Melee', total: d.attack.melee },
        { label: 'Ranged', total: d.attack.ranged },
        { label: 'CMB', total: d.cmb },
        ...c.weapons.filter((w) => d.weapons[w.id]).map((w) => ({ label: `${w.name || 'Weapon'} attack`, total: d.weapons[w.id].attackBreakdown })),
      ]}
    />
    <p>Extra attacks come every 5 points of BAB above +5 (−5 each). Damage adds the damage ability modifier × its multiplier (½ off-hand, 1½ two-handed), enhancement and damage bonuses.</p>
  {/snippet}
  <div class="grid grid-cols-4 gap-2">
    <Stat label="BAB" value={d.bab} size="md" />
    <Stat label="Melee" value={d.attack.melee} display={iterativeText(d.bab, d.attack.melee.total)} size="md" roll={{ title: 'Melee attack' }} />
    <Stat label="Ranged" value={d.attack.ranged} display={iterativeText(d.bab, d.attack.ranged.total)} size="md" roll={{ title: 'Ranged attack' }} />
    <Stat label="CMB" value={d.cmb} size="md" roll={{ title: 'Combat maneuver' }} />
  </div>

  <EditMode>{#snippet children(editing)}
  <DynamicList bind:items={c.weapons} onadd={() => c.weapons.push(make.weapon())} addLabel="Weapon" empty="No weapons yet.">
    {#snippet item(w)}
      {@const wd = d.weapons[w.id]}
      <div class="weapon-grid grid gap-x-2 gap-y-1">
        {#if editing}
          <div class="col-span-2 flex items-end gap-1 sm:col-span-1">
            <Field label="Enh" class="w-11 shrink-0 text-center">
              <NumInput bind:value={w.enhancement} signed aria-label="Enhancement" title="Enhancement bonus" />
            </Field>
            <Field label="Weapon" class="flex-1">
              <input class="w-full min-w-0 font-semibold" bind:value={w.name} aria-label="Weapon name" />
            </Field>
          </div>
        {:else}
          <Field label="Weapon" class="col-span-2 sm:col-span-1">
            <div class="flex items-center gap-1">
              {#if w.enhancement}
                <span class="font-semibold tabular-nums" title="Enhancement bonus">{fmt(w.enhancement)}</span>
              {/if}
              <input class="w-full min-w-0 font-semibold" bind:value={w.name} aria-label="Weapon name" />
            </div>
          </Field>
        {/if}
        <div class="field" title={wd ? breakdown(wd.attackBreakdown) : ''}>
          <div class="px-1 leading-7 font-bold tabular-nums">
            <Iterative text={wd?.attacks.map(fmt).join('/') ?? ''} onroll={wd ? { title: `${weaponName(w)} attack`, bonus: wd.attacks[0], parts: partsOf(wd.attackBreakdown) } : undefined} />
          </div>
          <span class="field-label">Attack</span>
        </div>
        <Field label="Damage">
          {#if editing}
            <div class="flex items-center gap-0.5">
              <input class="w-16 min-w-0" bind:value={w.damage} placeholder="1d8" aria-label="Damage dice" />
              {#if wd && wd.damageBonus !== 0}<span class="font-bold whitespace-nowrap tabular-nums">{fmt(wd.damageBonus)}</span>{/if}
            </div>
          {:else}
            <!-- Dice (adjusted for size changes) with the modifier right after: 2d6+8. -->
            <div class="flex items-center gap-0.5 px-1 leading-7 font-bold whitespace-nowrap tabular-nums" title={wd && wd.damageDice !== w.damage ? `${w.damage} before size change` : undefined}>
              {#if wd}
                <span use:rollable={{ title: `${weaponName(w)} damage`, roll: () => rollDamage(w, wd) }}>{wd.damageDice || '—'}{wd.damageBonus !== 0 ? fmt(wd.damageBonus) : ''}</span>
                <button type="button" class="icon-btn h-5 px-1 text-[0.6rem] font-normal print:hidden" title="Roll critical damage (×{critMultiplier(w.crit)})" aria-label="Roll {weaponName(w)} critical damage" onclick={() => rollDamage(w, wd, true)}>crit</button>
              {/if}
            </div>
          {/if}
        </Field>
        <Field label="Critical">
          {#if editing}
            <div class="flex items-center gap-0.5">
              <NumInput class="w-12 shrink-0" bind:value={w.critRange} aria-label="Crit range" title="Threat range: 20 = natural 20 only; 19 for 19–20 (keen weapons, improved critical…)" />
              <span class="opacity-60">–20/</span>
              <input class="w-14 min-w-0" bind:value={w.crit} placeholder="×2" aria-label="Crit multiplier" />
            </div>
          {:else}
            <div class="px-1 leading-7 whitespace-nowrap">{w.critRange !== 20 ? `${w.critRange}–20/` : ''}{w.crit}</div>
          {/if}
        </Field>
        <Field label="Range">
          {#if editing}<input bind:value={w.range} aria-label="Range" />{:else}<div class="px-1 leading-7 whitespace-nowrap">{w.range || '—'}</div>{/if}
        </Field>
        <Field label="Type">
          {#if editing}<input bind:value={w.type} placeholder="S/P/B" aria-label="Type" />{:else}<div class="px-1 leading-7 whitespace-nowrap">{w.type}</div>{/if}
        </Field>
      </div>
      {#if editing}
        <div class="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
          {#each w.extraDamage as x, i (x.id)}
            <div class="flex items-end gap-1">
              <input type="checkbox" class="mb-5" bind:checked={x.active} aria-label="Apply extra damage" title="Rolled with this weapon's damage while checked" />
              <Field label="Extra dice" class="w-20"><input bind:value={x.dice} placeholder="1d6" aria-label="Extra damage dice" /></Field>
              <Field label="Damage type" class="w-24"><input bind:value={x.type} placeholder="fire" aria-label="Extra damage type" /></Field>
              <button type="button" class="icon-btn mb-4 text-accent" aria-label="Remove extra damage" onclick={() => w.extraDamage.splice(i, 1)}>✕</button>
            </div>
          {/each}
          <button
            type="button"
            class={['btn text-xs print:hidden', { 'mb-4': w.extraDamage.length }]}
            title="Dice rolled with this weapon's damage and never multiplied on a critical (Flaming, sneak attack…)"
            onclick={() => w.extraDamage.push(make.extraDamage())}>+ Extra damage</button
          >
        </div>
      {:else if w.extraDamage.some((x) => x.dice) || wd?.extraDamage.some((x) => x.macro)}
        <!-- Click a chip to switch it on or off (sneak attack only when the target is flanked or denied Dex). -->
        <div class="mt-1 flex flex-wrap items-center gap-1">
          {#each w.extraDamage.filter((x) => x.dice) as x (x.id)}
            <button
              type="button"
              class={['chip tabular-nums', { 'line-through opacity-50': !x.active }]}
              aria-pressed={x.active}
              title={x.active ? 'Rolled with damage; click to switch off' : 'Off; click to roll it with damage'}
              onclick={() => (x.active = !x.active)}>+{x.dice}{x.type ? ` ${x.type}` : ''}</button
            >
          {/each}
          {#each wd?.extraDamage.filter((x) => x.macro) ?? [] as x, i (i)}
            <span class="chip border-dashed tabular-nums" title="From the {x.macro} macro; switch it off in Macros">+{x.notation}{x.type ? ` ${x.type}` : ''}</span>
          {/each}
          <span class="field-label">Extra damage</span>
        </div>
      {/if}
      <div class="mt-1 flex items-end gap-2">
        <Field label="Notes" class="flex-1 {w.notes ? '' : 'print:hidden'}"><input bind:value={w.notes} aria-label="Notes" /></Field>
        <Field label="Ammo" class="w-32 shrink-0"><input bind:value={w.ammo} aria-label="Ammo" /></Field>
      </div>
      {#if editing}
        <div class="mt-1 grid grid-cols-3 items-end gap-2 border-t border-ink/10 pt-1 sm:grid-cols-8 print:hidden">
          <Field label="Kind">
            <Select bind:value={w.kind} options={opts(['melee', 'ranged'] as const)} />
          </Field>
          <Field label="Atk abil">
            <Select bind:value={w.attackAbility} options={opts(ABILITIES, (a) => a.toUpperCase())} />
          </Field>
          <Field label="Atk misc"><NumInput bind:value={w.attackMisc} signed /></Field>
          <Field label="Dmg abil">
            <Select bind:value={w.damageAbility} options={[{ value: 'none' as const, label: 'None' }, ...opts(ABILITIES, (a) => a.toUpperCase())]} />
          </Field>
          <Field label="× abil">
            <Select
              bind:value={w.damageMultiplier}
              options={[
                { value: 0.5, label: '½ (off-hand)' },
                { value: 1, label: '1' },
                { value: 1.5, label: '1½ (two-handed)' },
              ]}
            />
          </Field>
          <Field label="Dmg misc"><NumInput bind:value={w.damageMisc} signed /></Field>
          <Field label="Weight"><NumInput bind:value={w.weight} /></Field>
          <Field label="Value (gp)"><NumInput bind:value={w.price} aria-label="Value in gp" /></Field>
        </div>
      {/if}
    {/snippet}
    {#snippet blank()}
      <div class="weapon-grid grid gap-2">
        {#each ['Weapon', 'Attack', 'Damage', 'Critical', 'Range', 'Type'] as l (l)}
          <div class="field"><div class="h-5 border-b border-ink/30"></div><span class="field-label">{l}</span></div>
        {/each}
      </div>
    {/snippet}
    {#snippet tools()}
      <DbPicker kind="items" label="Find weapon" filter={(it) => !!it.weapon} onpick={addWeapon}>
        {#snippet detail(it)}{it.weapon?.damage} · {it.weapon?.crit} · {it.weapon?.handedness} · {it.weight} lb{/snippet}
      </DbPicker>
    {/snippet}
  </DynamicList>
  {/snippet}</EditMode>
  <div class="print:hidden"><BonusList keys={KEYS} label="Attack / damage bonuses" /></div>
</Section>
