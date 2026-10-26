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
  import DbPicker from '../../lib/ui/DbPicker.svelte';
  import type { DbItem } from '../../lib/db/types';
  import { parseGp } from '../../lib/model/migrate';
  import { iterativeText } from '../../lib/rules/tables';
  import Chevron from '../../lib/ui/Chevron.svelte';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';
  import Select, { opts } from '../../lib/ui/Select.svelte';

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
      crit: w.crit,
      range: w.range,
      type: w.type,
      weight: it.weight,
      price: parseGp(it.price),
    });
  }

  const c = $derived(app.char);
  const d = $derived(app.d);
  let open = $state<Record<string, boolean>>({});

  const KEYS = ['attack', 'attack.melee', 'attack.ranged', 'damage', 'damage.melee', 'damage.ranged', 'cmb'];
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
    <Stat label="BAB" value={d.bab} display={iterativeText(d.bab, d.bab)} size="md" />
    <Stat label="Melee" value={d.attack.melee} display={iterativeText(d.bab, d.attack.melee.total)} size="md" />
    <Stat label="Ranged" value={d.attack.ranged} display={iterativeText(d.bab, d.attack.ranged.total)} size="md" />
    <Stat label="CMB" value={d.cmb} size="md" />
  </div>

  <DynamicList bind:items={c.weapons} onadd={() => c.weapons.push(make.weapon())} addLabel="Weapon" empty="No weapons yet.">
    {#snippet item(w)}
      {@const wd = d.weapons[w.id]}
      <div class="grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-[2fr_1.3fr_1fr_0.8fr_0.8fr_0.8fr]">
        <Field label="Weapon" class="col-span-2 sm:col-span-1"><input class="font-semibold" bind:value={w.name} /></Field>
        <div class="field" title={wd ? breakdown(wd.attackBreakdown) : ''}>
          <div class="px-1 font-bold tabular-nums">{wd?.attacks.map(fmt).join('/')}</div>
          <span class="field-label">Attack</span>
        </div>
        <Field label="Damage">
          <div class="flex items-baseline">
            <input class="w-full" bind:value={w.damage} placeholder="1d8" aria-label="Damage dice" />
            {#if wd && wd.damageBonus !== 0}<span class="font-bold whitespace-nowrap tabular-nums">{fmt(wd.damageBonus)}</span>{/if}
          </div>
        </Field>
        <Field label="Critical"><input bind:value={w.crit} /></Field>
        <Field label="Range"><input bind:value={w.range} /></Field>
        <Field label="Type"><input bind:value={w.type} placeholder="S/P/B" /></Field>
      </div>
      <div class={['mt-1 flex flex-wrap items-end gap-2', { 'print:hidden': !w.ammo && !w.notes }]}>
        <Field label="Ammo / notes" class="min-w-40 flex-1">
          <input value={[w.ammo, w.notes].filter(Boolean).join(' · ')} readonly class="hidden print:block" aria-hidden="true" tabindex="-1" />
          <div class="flex gap-1 print:hidden">
            <input class="w-24" bind:value={w.ammo} placeholder="Ammo" aria-label="Ammo" />
            <input class="flex-1" bind:value={w.notes} placeholder="Notes" aria-label="Notes" />
          </div>
        </Field>
        <button type="button" class="inline-flex w-12 items-center justify-end gap-0.5 text-xs opacity-70 hover:opacity-100 print:hidden" aria-expanded={!!open[w.id]} onclick={() => (open[w.id] = !open[w.id])}>
          Details <Chevron open={!!open[w.id]} />
        </button>
      </div>
      {#if open[w.id]}
        <div class="mt-1 grid grid-cols-3 items-end gap-2 border-t border-ink/10 pt-1 sm:grid-cols-9 print:hidden">
          <Field label="Kind">
            <Select bind:value={w.kind} options={opts(['melee', 'ranged'] as const)} />
          </Field>
          <Field label="Atk abil">
            <Select bind:value={w.attackAbility} options={opts(ABILITIES, (a) => a.toUpperCase())} />
          </Field>
          <Field label="Enh."><NumInput bind:value={w.enhancement} signed /></Field>
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
          <Field label="Value (gp)"><NumInput bind:value={w.price} /></Field>
        </div>
      {/if}
    {/snippet}
    {#snippet blank()}
      <div class="grid grid-cols-[2fr_1.3fr_1fr_0.8fr_0.8fr_0.8fr] gap-2">
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
  <div class="print:hidden"><BonusList keys={KEYS} label="Attack / damage bonuses" /></div>
</Section>
