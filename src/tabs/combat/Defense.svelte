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
  import EditMode from '../../lib/ui/EditMode.svelte';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';

  const c = $derived(app.char);
  const d = $derived(app.d);
  const KEYS = ['ac', 'save', 'save.fort', 'save.ref', 'save.will', 'cmd'];
</script>

{#snippet naturalRow()}
  <div class="flex items-center gap-1">
    <NumInput class="w-12" bind:value={c.naturalArmor} signed aria-label="Natural armor bonus" />
    <span class="w-28 px-1.5 text-xs opacity-70">natural</span>
    <span class="flex-1 px-1.5">Natural armor</span>
  </div>
{/snippet}

<Section id="defense" editable>
  {#snippet info()}
    <BreakdownList
      items={[
        { label: 'AC', total: d.ac.normal, signed: false },
        { label: 'Touch AC', total: d.ac.touch, signed: false },
        { label: 'Flat-footed AC', total: d.ac.flatFooted, signed: false },
        { label: 'Fortitude', total: d.saves.fort },
        { label: 'Reflex', total: d.saves.ref },
        { label: 'Will', total: d.saves.will },
        { label: 'CMD', total: d.cmd, signed: false },
      ]}
    />
    <p>Touch AC ignores armor, shield and natural armor bonuses. Flat-footed AC loses Dex and dodge bonuses. Flat-footed CMD is {d.cmdFlatFooted}.</p>
    <p>Max Dex and armor check penalty use the worst of your armor, shield and carried load.</p>
  {/snippet}
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
      <td data-label="Eq" class="text-center align-middle"><input type="checkbox" bind:checked={a.equipped} aria-label="Equipped" /></td>
      <td data-label="Armor / shield" class="min-w-32"><input class="w-full" bind:value={a.name} aria-label="Name" /></td>
      <td data-label="Kind">
        <select bind:value={a.kind} aria-label="Kind"><option value="armor">Armor</option><option value="shield">Shield</option></select>
      </td>
      <td data-label="AC" class="w-11"><NumInput bind:value={a.acBonus} signed aria-label="AC bonus" /></td>
      <td data-label="Enh" class="w-11"><NumInput bind:value={a.enhancement} signed aria-label="Enhancement" /></td>
      <td data-label="Max Dex" class="w-12">
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
      <td data-label="ACP" class="w-11"><NumInput bind:value={a.checkPenalty} aria-label="Armor check penalty" /></td>
      <td data-label="ASF%" class="w-11"><NumInput bind:value={a.spellFailure} aria-label="Arcane spell failure" /></td>
      <td data-label="Category" class="w-24"><input class="w-full" list="armor-categories" bind:value={a.category} aria-label="Category" /></td>
      <td data-label="Wt" class="w-12"><NumInput bind:value={a.weight} aria-label="Weight" /></td>
      <td data-label="gp" class="w-14"><NumInput bind:value={a.price} aria-label="Value in gp" /></td>
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

  <div class="group-box group-box-dark grid grid-cols-3 gap-1">
    <Stat label="AC" value={d.ac.normal} signed={false} big />
    <Stat label="Touch" value={d.ac.touch} signed={false} big />
    <Stat label="Flat-footed" value={d.ac.flatFooted} signed={false} big />
  </div>
  <div class="group-box group-box-dark grid grid-cols-3 gap-1">
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

  <EditMode>
    {#snippet children(editing)}
      {#if c.naturalArmor !== 0 || editing}
        <BonusList keys={KEYS} label="AC / save bonuses" fixed={naturalRow} />
      {:else}
        <BonusList keys={KEYS} label="AC / save bonuses" />
      {/if}

      <div class="mt-auto flex flex-col border-t border-ink/30 pt-1">
        <span class="field-label">Resistances & immunities</span>
        <div class="flex flex-wrap items-center gap-1">
          {#each c.resistances as r, i (r.id)}
            {#if editing}
              <span class="chip">
                <input class="chip-input" bind:value={r.name} placeholder="fire" aria-label="Resistance type" />
                <input class="chip-input font-semibold" bind:value={r.value} placeholder="—" aria-label="Resistance amount (blank for immunity)" />
                <button type="button" class="print:hidden" aria-label="Remove resistance" onclick={() => c.resistances.splice(i, 1)}>×</button>
              </span>
            {:else}
              <span class="chip">{r.name}{#if r.value.trim()}<strong>{r.value}</strong>{/if}</span>
            {/if}
          {:else}
            {#if !editing}<span class="text-sm italic opacity-40 print:hidden">None</span>{/if}
          {/each}
          {#if editing}
            <button type="button" class="add-btn print:hidden" onclick={() => c.resistances.push(make.resistance())}>+ Resistance</button>
          {/if}
          <span class="chip hidden w-24 print:inline-flex">&nbsp;</span>
        </div>
      </div>
    {/snippet}
  </EditMode>
</Section>
