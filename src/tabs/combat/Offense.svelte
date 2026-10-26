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
    });
  }

  const c = $derived(app.char);
  const d = $derived(app.d);
  let open = $state<Record<string, boolean>>({});

  const KEYS = ['attack', 'attack.melee', 'attack.ranged', 'damage', 'damage.melee', 'damage.ranged', 'cmb'];
</script>

<Section id="offense">
  <div class="grid grid-cols-4 gap-2">
    <Stat label="BAB" value={d.bab} big />
    <Stat label="Melee" value={d.attack.melee} big />
    <Stat label="Ranged" value={d.attack.ranged} big />
    <Stat label="CMB" value={d.cmb} big />
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
        <button type="button" class="text-xs underline opacity-70 print:hidden" aria-expanded={!!open[w.id]} onclick={() => (open[w.id] = !open[w.id])}>
          {open[w.id] ? 'Hide' : 'Details'}
        </button>
      </div>
      {#if open[w.id]}
        <div class="mt-1 grid grid-cols-4 gap-2 border-t border-ink/10 pt-1 sm:grid-cols-8 print:hidden">
          <Field label="Kind">
            <select bind:value={w.kind}><option value="melee">Melee</option><option value="ranged">Ranged</option></select>
          </Field>
          <Field label="Atk abil">
            <select bind:value={w.attackAbility}>{#each ABILITIES as a (a)}<option value={a}>{a.toUpperCase()}</option>{/each}</select>
          </Field>
          <Field label="Enh."><NumInput bind:value={w.enhancement} signed /></Field>
          <Field label="Atk misc"><NumInput bind:value={w.attackMisc} signed /></Field>
          <Field label="Dmg abil">
            <select bind:value={w.damageAbility}>
              <option value="none">None</option>
              {#each ABILITIES as a (a)}<option value={a}>{a.toUpperCase()}</option>{/each}
            </select>
          </Field>
          <Field label="× abil">
            <select bind:value={w.damageMultiplier}>
              <option value={0.5}>½ (off-hand)</option>
              <option value={1}>1</option>
              <option value={1.5}>1½ (two-handed)</option>
            </select>
          </Field>
          <Field label="Dmg misc"><NumInput bind:value={w.damageMisc} signed /></Field>
          <Field label="Weight"><NumInput bind:value={w.weight} /></Field>
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
  </DynamicList>
  <DbPicker kind="items" label="Find weapon" filter={(it) => !!it.weapon} onpick={addWeapon}>
    {#snippet detail(it)}{it.weapon?.damage} · {it.weapon?.crit} · {it.weapon?.handedness} · {it.weight} lb{/snippet}
  </DbPicker>
  <div class="print:hidden"><BonusList keys={KEYS} label="Attack / damage bonuses" /></div>
</Section>
