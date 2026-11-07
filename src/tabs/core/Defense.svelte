<script lang="ts">
  import { moveItem } from '../../lib/arrays';
  import { make } from '../../lib/model/defaults';
  import { SAVES, SAVE_NAMES } from '../../lib/model/types';
  import { parseGp } from '../../lib/model/migrate';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import EditHint from '../../lib/ui/EditHint.svelte';
  import DefenseStats from '../../lib/ui/DefenseStats.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';
  import BonusList from '../../lib/ui/BonusList.svelte';
  import DbPicker from '../../lib/ui/DbPicker.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';
  import { sortable } from '../../lib/ui/sortable';
  import { breakdown, fmt } from '../../lib/ui/format';
  import Select, { opts } from '../../lib/ui/Select.svelte';

  const c = $derived(app.char);
  const d = $derived(app.d);
  const KEYS = ['ac', 'ac.armor', 'ac.shield', 'ac.natural', 'save', 'save.fort', 'save.ref', 'save.will', 'cmd', 'concealment'];
  const concealTip = $derived(
    d.concealment.sources.length
      ? `Miss chance: the highest applies (they don't stack)\n${d.concealment.sources.map((x) => `${x.source} ${x.value}%`).join('\n')}`
      : 'Miss chance from concealment (blur 20%, displacement 50%). Macros can raise it with the concealment key.',
  );
</script>

<Section id="defense" editable>
  {#snippet info()}
    <BreakdownList
      items={[
        { label: 'AC', total: d.ac.normal, signed: false },
        { label: 'Touch AC', total: d.ac.touch, signed: false },
        { label: 'Flat-footed AC', total: d.ac.flatFooted, signed: false },
        ...SAVES.map((s) => ({ label: SAVE_NAMES[s], total: d.saves[s] })),
        { label: 'CMD', total: d.cmd, signed: false },
      ]}
    />
    <p>Armor, shield and natural armor each total their own bonuses first, so an enhancement bonus to natural armor (amulet, barkskin) doesn't compete with one to armor. Pick Armor bonus, Shield bonus or Natural armor under "Applies to" for those.</p>
    <p>Concealment gives attackers a miss chance; the highest source applies.</p>
    <p>Touch AC ignores armor, shield and natural armor bonuses. Flat-footed AC loses Dex and dodge bonuses. Flat-footed CMD is {d.cmdFlatFooted}.</p>
    <p>Max Dex and armor check penalty use the worst of your armor, shield and carried load.</p>
    <p>In Edit mode, armor values (gp) appear and resistances can be dragged by ⋮⋮ to reorder.</p>
  {/snippet}
  <EditMode>{#snippet children(editing)}
  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ink/30 pb-1 text-sm">
    {#if editing}
      <label class="inline-flex items-center gap-1" title="Base natural armor (race, form). Bonuses to it, such as an amulet of natural armor, go in the AC bonus list as Natural armor.">
        <span class="field-label">Natural armor</span>
        <NumInput class="h-6 w-10" bind:value={c.naturalArmor} signed aria-label="Natural armor bonus" />
        {#if d.naturalArmor.total !== c.naturalArmor}<span class="tabular-nums opacity-70">= {fmt(d.naturalArmor.total)}</span>{/if}
      </label>
    {:else if d.naturalArmor.total}
      <span title={breakdown(d.naturalArmor)}><span class="field-label">Natural armor</span> {fmt(d.naturalArmor.total)}</span>
    {/if}
    <span><span class="field-label">Max Dex</span> {d.maxDex ?? '—'}</span>
    <span><span class="field-label">ACP</span> {d.acp}</span>
    <span title="Arcane spell failure: the sum of equipped armor and shield"><span class="field-label">Spell failure</span> {d.spellFailure}%</span>
    {#if editing}
      <label class="inline-flex items-center gap-1" title={concealTip}>
        <span class="field-label">Concealed</span>
        <NumInput class="h-6 w-10" bind:value={c.concealment} aria-label="Base concealment miss chance" />%
        {#if d.concealment.total !== c.concealment}<span class="tabular-nums opacity-70">= {d.concealment.total}%</span>{/if}
      </label>
    {:else}
      <span title={concealTip}><span class="field-label">Concealed</span> {d.concealment.total}%</span>
    {/if}
    <span class="ml-auto"><span class="field-label">Load</span> <span class="capitalize" class:text-accent={d.load !== 'light'}>{d.load}</span></span>
  </div>
  {/snippet}</EditMode>

  <EditMode>{#snippet children(editing)}
  <DynamicTable
    bind:items={c.armor}
    cols={editing ? 12 : 10}
    onadd={() => c.armor.push(make.armor(c.armor.some((a) => a.kind === 'armor') ? 'shield' : 'armor'))}
    addLabel="Armor / shield"
    empty="No armor or shield."
    detailPrints={(a) => !!a.notes.trim()}
  >
    {#snippet head()}
      <th title="Equipped">Eq</th>
      {#if editing}<th class="text-center" title="Enhancement bonus">Enh</th>{/if}
      <th>Armor / shield</th>
      <th>Kind</th>
      <th class="text-center">AC</th>
      <th class="text-center">Max Dex</th>
      <th class="text-center">ACP</th>
      <th class="text-center">ASF%</th>
      <th>Category</th>
      <th class="text-center" title="Not proficient: armor check penalty also applies to attack rolls">NP</th>
      <th class="text-center">Wt</th>
      {#if editing}<th class="text-center">gp</th>{/if}
    {/snippet}
    {#snippet row(a)}
      <td data-label="Eq" class="text-center align-middle"><input type="checkbox" class="mx-auto block" bind:checked={a.equipped} aria-label="Equipped" /></td>
      {#if editing}<td data-label="Enh" class="w-11"><NumInput bind:value={a.enhancement} signed aria-label="Enhancement" /></td>{/if}
      <td data-label="Armor / shield" class="min-w-32">
        <div class="flex items-center gap-1">
          {#if !editing && a.enhancement}<span class="font-semibold tabular-nums" title="Enhancement bonus">{fmt(a.enhancement)}</span>{/if}
          <input class="w-full" bind:value={a.name} aria-label="Name" />
        </div>
      </td>
      <td data-label="Kind">
        <Select bind:value={a.kind} options={opts(['armor', 'shield'] as const)} aria-label="Kind" />
      </td>
      <td data-label="AC" class="w-11"><NumInput bind:value={a.acBonus} signed aria-label="AC bonus" /></td>
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
      <td data-label="NP" class="text-center align-middle"><input type="checkbox" class="mx-auto block" bind:checked={a.nonProficient} aria-label="Not proficient" title="Not proficient: armor check penalty also applies to attack rolls" /></td>
      <td data-label="Wt" class="w-12"><NumInput bind:value={a.weight} aria-label="Weight" /></td>
      {#if editing}<td data-label="gp" class="w-14"><NumInput bind:value={a.price} aria-label="Value in gp" /></td>{/if}
    {/snippet}
    {#snippet detail(a)}
      <textarea rows="1" class="w-full text-xs" bind:value={a.notes} placeholder="Notes (special materials, abilities…)" aria-label="{a.name || 'Armor'} notes"></textarea>
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
  {/snippet}</EditMode>
  <datalist id="armor-categories">
    <option value="light"></option><option value="medium"></option><option value="heavy"></option>
    <option value="buckler"></option><option value="light shield"></option><option value="heavy shield"></option><option value="tower"></option>
  </datalist>

  <DefenseStats ac={d.ac} saves={d.saves} saveDice={d.saveDice} />
  <div class="grid grid-cols-3 gap-1 px-1">
    <div class="stat" title="Flat-footed CMD: {d.cmdFlatFooted}">
      <div class="stat-value text-2xl">{d.cmd.total}</div>
      <div class="field-label">CMD <span class="normal-case">(FF {d.cmdFlatFooted})</span></div>
    </div>
    <div class="stat">
      <NumInput class="stat-value h-8 w-20 text-2xl" bind:value={c.spellResistance} aria-label="Spell resistance" />
      <div class="field-label">Spell resist.</div>
    </div>
    <div class="stat">
      <input class="stat-value h-8 w-24 text-center text-2xl" bind:value={c.damageReduction} placeholder="—" aria-label="Damage reduction" />
      <div class="field-label">DR</div>
    </div>
  </div>

  <EditMode>
    {#snippet children(editing)}
      <BonusList keys={KEYS} label="AC / save bonuses" placeholder="Source (e.g. Ring of protection)" />

      <div class="mt-auto flex flex-col border-t border-ink/30 pt-1">
        <span class="field-label">Resistances & immunities</span>
        <div class="flex flex-wrap items-center gap-1" use:sortable={{ onmove: (from, to) => moveItem(c.resistances, from, to) }}>
          {#each c.resistances as r, i (r.id)}
            {#if editing}
              <span class="chip" data-sort-index={i}>
                <span class="-ml-0.5 cursor-grab touch-none text-xs opacity-40 select-none hover:opacity-80 print:hidden" data-sort-handle title="Drag to reorder" aria-hidden="true">⋮⋮</span>
                <input class="chip-input" bind:value={r.name} placeholder="fire 10" aria-label="Resistance or immunity" />
                <button type="button" class="print:hidden" aria-label="Remove resistance" onclick={() => c.resistances.splice(i, 1)}>×</button>
              </span>
            {:else}
              <span class="chip">{r.name}</span>
            {/if}
          {:else}
            {#if !editing}<span class="text-sm italic opacity-40 print:hidden">None<EditHint /></span>{/if}
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
