<script lang="ts">
  import { make } from '../../lib/model/defaults';
  import { uid } from '../../lib/model/id';
  import { bonusRowsFor, featKey } from '../../lib/rules/featBonuses';
  import type { Feat } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import DynamicTable from '../../lib/ui/DynamicTable.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import DbPicker from '../../lib/ui/DbPicker.svelte';
  import Combobox from '../../lib/ui/Combobox.svelte';

  const c = $derived(app.char);
  const SOURCES = ['Level', 'Human bonus', 'Fighter bonus', 'Class bonus', 'Racial', 'Item'];
  // One feat at 1st level and every odd level after.
  const expected = $derived(Math.ceil(app.d.level / 2));
  const general = $derived(c.feats.filter((f) => !/bonus/i.test(f.source)).length);

  function sortByLevel() {
    c.feats.sort((a, b) => a.level - b.level);
  }

  /** Fixed always-on feats add their bonus rows to the matching section (once). */
  function applyBonuses(name: string) {
    const rows = bonusRowsFor(name, uid);
    if (rows.length && !c.bonuses.some((b) => b.source === rows[0].source)) c.bonuses.push(...rows);
  }
  function remove(f: Feat) {
    const key = featKey(f.name);
    c.feats.splice(c.feats.indexOf(f), 1);
    if (key && !c.feats.some((x) => featKey(x.name) === key)) c.bonuses = c.bonuses.filter((b) => b.source !== key);
  }
</script>

<Section id="feats" editable>
  {#snippet info()}
    <p>Characters gain a feat at 1st level and every odd level after ({expected} at level {app.d.level}). Bonus feats from race or class don't count toward that; mark them in Source (e.g. "Fighter bonus").</p>
    <p>Always-on feats such as Improved Initiative, Iron Will or Dodge add a row to that section's bonus list when picked (Weapon Focus adds +1 to all attacks: move it to the weapon's Atk misc if you carry several). Toughness is applied by name. Conditional feats (Power Attack, Deadly Aim…) are macros.</p>
  {/snippet}
  {#snippet actions()}
    <span class="text-xs" title="Feats from character level (excludes bonus feats)">{general}/{expected} level feats</span>
    <EditMode>{#snippet children(editing)}{#if editing}<button type="button" class="head-btn" onclick={sortByLevel}>Sort</button>{/if}{/snippet}</EditMode>
  {/snippet}
  <DynamicTable bind:items={c.feats} cols={4} onadd={() => c.feats.push(make.feat(Math.max(1, app.d.level)))} onremove={remove} addLabel="Feat" empty="No feats yet.">
    {#snippet head()}
      <th class="text-center">Lvl</th>
      <th>Feat</th>
      <th>Source</th>
      <th>Notes</th>
    {/snippet}
    {#snippet row(f)}
      <td data-label="Lvl" class="w-10"><NumInput bind:value={f.level} aria-label="Level gained" /></td>
      <td data-label="Feat" class="w-2/5"><input class="font-semibold" bind:value={f.name} aria-label="Feat name" onchange={() => applyBonuses(f.name)} /></td>
      <td data-label="Source" class="w-24"><Combobox class="w-full" bind:value={f.source} suggestions={SOURCES} aria-label="Source" /></td>
      <td data-label="Notes"><textarea rows="1" class="w-full" bind:value={f.description} aria-label="Notes"></textarea></td>
    {/snippet}
    {#snippet tools()}
      <DbPicker
        kind="feats"
        label="Find feat"
        onpick={(f) => {
          c.feats.push({ ...make.feat(Math.max(1, app.d.level)), name: f.name, source: 'Level', description: f.summary });
          applyBonuses(f.name);
        }}
      >
        {#snippet detail(f)}{f.tags.join(', ')}{f.summary ? ` — ${f.summary}` : ''}{/snippet}
      </DbPicker>
    {/snippet}
  </DynamicTable>
</Section>
