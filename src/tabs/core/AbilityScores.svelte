<script lang="ts">
  import { ABILITIES } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import AbilityTable from '../../lib/ui/AbilityTable.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';

  const PARTS = ['base', 'racial', 'level', 'enhancement', 'inherent', 'misc'] as const;
  const HEAD: Partial<Record<(typeof PARTS)[number], string>> = { enhancement: 'enh.', level: 'lvl' };
  const inc = $derived(app.d.abilityIncreases);
</script>

<Section id="abilities" editable>
  {#snippet info()}
    <BreakdownList items={ABILITIES.map((a) => ({ label: a.toUpperCase(), total: app.d.abilities[a].breakdown, signed: false }))} />
    <p>Temp columns show scores including temporary changes, active macros and conditions. Enter damage, drain or short-term changes in the ± column; use Edit to change base, racial, level-up (+1 at 4th, 8th, 12th, 16th and 20th level), enhancement, inherent and misc values.</p>
  {/snippet}
  <AbilityTable abilities={app.d.abilities} scores={app.char.abilities} roll />
  <EditMode>{#snippet children(editing)}
  {#if editing}
    <div class="overflow-x-auto print:hidden">
      <table class="w-full text-sm">
        <thead>
          <tr>
            <th></th>
            {#each PARTS as p (p)}<th class="text-center" title={p === 'level' ? 'Level-up increases (+1 at 4th, 8th, 12th, 16th and 20th level)' : undefined}>{HEAD[p] ?? p}</th>{/each}
          </tr>
        </thead>
        <tbody>
          {#each ABILITIES as a (a)}
            <tr>
              <th>{a.toUpperCase()}</th>
              {#each PARTS as p (p)}
                <td><NumInput bind:value={app.char.abilities[a][p]} aria-label="{a} {p}" /></td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
      <p class={['text-xs', inc.used > inc.expected ? 'text-accent' : 'opacity-70']}>Level-up increases used: {inc.used}/{inc.expected}</p>
    </div>
  {/if}
  {/snippet}</EditMode>
</Section>
