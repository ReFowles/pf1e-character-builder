<script lang="ts">
  import { ABILITIES } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import AbilityTable from '../../lib/ui/AbilityTable.svelte';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import { POINT_BUY_MAX, POINT_BUY_MIN } from '../../lib/rules/pointBuy';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';

  const PARTS = ['base', 'racial', 'level', 'enhancement', 'inherent', 'misc'] as const;
  const HEAD: Partial<Record<(typeof PARTS)[number], string>> = { enhancement: 'enh.', level: 'lvl' };
  const inc = $derived(app.d.abilityIncreases);
  const pb = $derived(app.d.pointBuy);
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
      {#if app.char.pointBuy.enabled}
        <p class={['mb-2 text-sm font-bold tabular-nums', pb.remaining < 0 && 'text-accent']}>Point buy: {pb.spent}/{app.char.pointBuy.budget} points ({pb.remaining} left)</p>
      {/if}
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
                <td>
                  {#if p === 'base' && app.char.pointBuy.enabled}
                    <div class="flex items-center gap-0.5">
                      <button type="button" class="icon-btn size-6 shrink-0" aria-label="Decrease {a} base" disabled={app.char.abilities[a].base <= POINT_BUY_MIN} onclick={() => app.char.abilities[a].base--}>−</button>
                      <NumInput bind:value={app.char.abilities[a][p]} aria-label="{a} {p}" />
                      <button type="button" class="icon-btn size-6 shrink-0" aria-label="Increase {a} base" disabled={app.char.abilities[a].base >= POINT_BUY_MAX} onclick={() => app.char.abilities[a].base++}>+</button>
                    </div>
                  {:else}
                    <NumInput bind:value={app.char.abilities[a][p]} aria-label="{a} {p}" />
                  {/if}
                  {#if p === 'base' && app.char.pointBuy.enabled}<div class="text-center text-xs opacity-70" title="Point cost">{pb.costs[a]} pt</div>{/if}
                </td>
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
