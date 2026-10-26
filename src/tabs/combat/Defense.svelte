<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { parseGp } from '../../lib/model/migrate';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Stat from '../../lib/ui/Stat.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';
  import DbPicker from '../../lib/ui/DbPicker.svelte';

  const c = $derived(app.char);
  const d = $derived(app.d);
  const KEYS = ['ac', 'save', 'save.fort', 'save.ref', 'save.will', 'cmd'];
</script>

<Section id="defense">
  <div class="flex flex-wrap items-baseline gap-x-4 border-b border-ink/30 pb-1 text-sm">
    <span><span class="field-label">Max Dex</span> {d.maxDex ?? '—'}</span>
    <span><span class="field-label">ACP</span> {d.acp}</span>
    <span><span class="field-label">Spell failure</span> {d.spellFailure}%</span>
    <span class="ml-auto"><span class="field-label">Load</span> <span class="capitalize" class:text-accent={d.load !== 'light'}>{d.load}</span></span>
  </div>

  <DynamicTable
    bind:items={c.armor}
    cols={11}
    onadd={() => c.armor.push(make.armor(c.armor.some((a) => a.kind === 'armor') ? 'shield' : 'armor'))}
    addLabel="Armor / shield"
    empty="No armor or shield."
  >
    {#snippet head()}
      <th title="Equipped">Eq</th>
      <th>Armor / shield</th>
      <th>Kind</th>
      <th class="text-center">AC</th>
      <th class="text-center">Enh</th>
      <th class="text-center">Max Dex</th>
      <th class="text-center">ACP</th>
      <th class="text-center">ASF%</th>
      <th>Category</th>
      <th class="text-center">Wt</th>
      <th class="text-center">gp</th>
    {/snippet}
    {#snippet row(a)}
      <td class="text-center align-middle"><input type="checkbox" bind:checked={a.equipped} aria-label="Equipped" /></td>
      <td class="min-w-32"><input class="w-full" bind:value={a.name} aria-label="Name" /></td>
      <td>
        <select bind:value={a.kind} aria-label="Kind"><option value="armor">Armor</option><option value="shield">Shield</option></select>
      </td>
      <td class="w-11"><NumInput bind:value={a.acBonus} signed aria-label="AC bonus" /></td>
      <td class="w-11"><NumInput bind:value={a.enhancement} signed aria-label="Enhancement" /></td>
      <td class="w-12">
        <input
          class="num"
          aria-label="Max Dex (blank for none)"
          value={a.maxDex ?? ''}
          placeholder="—"
          onchange={(e) => {
            const v = e.currentTarget.value.trim();
            a.maxDex = v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
          }}
        />
      </td>
      <td class="w-11"><NumInput bind:value={a.checkPenalty} aria-label="Armor check penalty" /></td>
      <td class="w-11"><NumInput bind:value={a.spellFailure} aria-label="Arcane spell failure" /></td>
      <td class="w-24"><input class="w-full" list="armor-categories" bind:value={a.category} aria-label="Category" /></td>
      <td class="w-12"><NumInput bind:value={a.weight} aria-label="Weight" /></td>
      <td class="w-14"><NumInput bind:value={a.price} aria-label="Value in gp" /></td>
    {/snippet}
    {#snippet tools()}
      <DbPicker
        kind="items"
        label="Find armor or shield"
        filter={(it) => !!it.armor}
        onpick={(it) =>
          c.armor.push({
            ...make.armor(it.armor!.kind),
            name: it.name,
            acBonus: it.armor!.ac,
            maxDex: it.armor!.maxDex,
            checkPenalty: it.armor!.acp,
            spellFailure: it.armor!.asf,
            category: it.armor!.category,
            weight: it.weight,
            price: parseGp(it.price),
          })}
      >
        {#snippet detail(it)}+{it.armor?.ac} {it.armor?.category} · max Dex {it.armor?.maxDex ?? '—'} · ACP {it.armor?.acp} · {it.weight} lb{/snippet}
      </DbPicker>
    {/snippet}
  </DynamicTable>
  <datalist id="armor-categories">
    <option value="light"></option><option value="medium"></option><option value="heavy"></option>
    <option value="buckler"></option><option value="light shield"></option><option value="heavy shield"></option><option value="tower"></option>
  </datalist>

  <div class="group-box grid grid-cols-3 gap-1">
    <Stat label="AC" value={d.ac.normal} signed={false} big />
    <Stat label="Touch" value={d.ac.touch} signed={false} big />
    <Stat label="Flat-footed" value={d.ac.flatFooted} signed={false} big />
  </div>
  <div class="group-box grid grid-cols-3 gap-1">
    <Stat label="Fortitude" value={d.saves.fort} big />
    <Stat label="Reflex" value={d.saves.ref} big />
    <Stat label="Will" value={d.saves.will} big />
  </div>
  <div class="grid grid-cols-3 gap-1 px-1">
    <div class="stat" title="Flat-footed CMD: {d.cmdFlatFooted}">
      <div class="stat-value text-3xl">{d.cmd.total}</div>
      <div class="field-label">CMD <span class="normal-case">(FF {d.cmdFlatFooted})</span></div>
    </div>
    <div class="stat">
      <NumInput class="stat-value h-9 w-20 text-3xl" bind:value={c.spellResistance} aria-label="Spell resistance" />
      <div class="field-label">Spell resist.</div>
    </div>
    <div class="stat">
      <input class="stat-value h-9 w-24 text-center text-3xl" bind:value={c.damageReduction} placeholder="—" aria-label="Damage reduction" />
      <div class="field-label">DR</div>
    </div>
  </div>

  <BonusList keys={KEYS} label="AC / save bonuses">
    {#snippet fixed()}
      <div class="flex items-center gap-1">
        <NumInput class="w-12" bind:value={c.naturalArmor} signed aria-label="Natural armor bonus" />
        <span class="w-24 px-1.5 text-xs opacity-70">natural</span>
        <span class="flex-1 px-1.5">Natural armor</span>
        <span class="w-6"></span>
      </div>
    {/snippet}
  </BonusList>

  <div class="mt-auto flex flex-col border-t border-ink/30 pt-1">
    <span class="field-label">Resistances & immunities</span>
    <div class="flex flex-wrap items-center gap-1">
      {#each c.resistances as r, i (r.id)}
        <span class="chip">
          <input class="h-6 w-20 border-0 bg-transparent p-0" bind:value={r.name} placeholder="fire" aria-label="Resistance type" />
          <input class="h-6 w-10 border-0 bg-transparent p-0 text-center" bind:value={r.value} placeholder="10" aria-label="Resistance amount" />
          <button type="button" class="print:hidden" aria-label="Remove resistance" onclick={() => c.resistances.splice(i, 1)}>×</button>
        </span>
      {/each}
      <button type="button" class="add-btn print:hidden" onclick={() => c.resistances.push(make.resistance())}>+ Resistance</button>
      <span class="chip hidden w-28 print:inline-flex">&nbsp;</span>
    </div>
  </div>
</Section>
