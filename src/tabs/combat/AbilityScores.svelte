<script lang="ts">
  import { ABILITIES } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import { breakdown, fmt } from '../../lib/ui/format';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';

  const PARTS = ['base', 'racial', 'enhancement', 'inherent', 'misc', 'temp'] as const;
</script>

<Section id="abilities" editable>
  {#snippet info()}
    <BreakdownList items={ABILITIES.map((a) => ({ label: a.toUpperCase(), total: app.d.abilities[a].breakdown, signed: false }))} />
    <p>Temp columns show scores including temporary changes, active macros and conditions. Use Edit to change base, racial, enhancement, inherent, misc and temp values.</p>
  {/snippet}
  <table class="w-full text-center">
    <thead>
      <tr>
        <th></th>
        <th class="text-center">Score</th>
        <th class="text-center">Mod</th>
        <th class="text-center">Temp</th>
        <th class="text-center">Temp mod</th>
      </tr>
    </thead>
    <tbody>
      {#each ABILITIES as a (a)}
        {@const s = app.d.abilities[a]}
        <tr title={breakdown(s.breakdown)}>
          <th class="w-12 bg-head py-1 text-center text-sm text-head-ink opacity-100" style="print-color-adjust: exact">{a.toUpperCase()}</th>
          <td class="text-xl font-bold tabular-nums">{s.score}</td>
          <td class="text-xl font-bold tabular-nums">{fmt(s.mod)}</td>
          <td class="px-1 py-0.5"><div class="write-box h-7 leading-7 tabular-nums">{s.hasTemp ? s.tempScore : ''}</div></td>
          <td class="px-1 py-0.5"><div class="write-box h-7 leading-7 tabular-nums">{s.hasTemp ? fmt(s.tempMod) : ''}</div></td>
        </tr>
      {/each}
    </tbody>
  </table>
  <EditMode>{#snippet children(editing)}
  {#if editing}
    <div class="overflow-x-auto print:hidden">
      <table class="w-full text-sm">
        <thead>
          <tr>
            <th></th>
            {#each PARTS as p (p)}<th class="text-center">{p === 'enhancement' ? 'enh.' : p}</th>{/each}
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
      <p class="mt-1 text-xs opacity-60">Temp holds damage/drain or short-term changes. Active macros and conditions also show in the temp columns.</p>
    </div>
  {/if}
  {/snippet}</EditMode>
</Section>
