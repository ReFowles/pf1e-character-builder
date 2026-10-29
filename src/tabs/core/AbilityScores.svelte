<script lang="ts">
  import { ABILITIES } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import { breakdown, fmt } from '../../lib/ui/format';
  import EditMode from '../../lib/ui/EditMode.svelte';
  import BreakdownList from '../../lib/ui/BreakdownList.svelte';
  import { rollable } from '../../lib/dice/rollable';

  const PARTS = ['base', 'racial', 'level', 'enhancement', 'inherent', 'misc'] as const;
  const HEAD: Partial<Record<(typeof PARTS)[number], string>> = { enhancement: 'enh.', level: 'lvl' };
  const inc = $derived(app.d.abilityIncreases);
</script>

<Section id="abilities" editable>
  {#snippet info()}
    <BreakdownList items={ABILITIES.map((a) => ({ label: a.toUpperCase(), total: app.d.abilities[a].breakdown, signed: false }))} />
    <p>Temp columns show scores including temporary changes, active macros and conditions. Enter damage, drain or short-term changes in the ± column; use Edit to change base, racial, level-up (+1 at 4th, 8th, 12th, 16th and 20th level), enhancement, inherent and misc values.</p>
  {/snippet}
  <table class="ability-table w-full text-center">
    <thead>
      <tr>
        <th></th>
        <th class="text-center">Score</th>
        <th class="text-center">Mod</th>
        <th class="w-14 text-center">Temp</th>
        <th class="w-14 text-center">Temp mod</th>
        <th class="w-14 text-center" title="Temporary change to the score (damage, drain, enhancement…)">±</th>
      </tr>
    </thead>
    <tbody>
      {#each ABILITIES as a (a)}
        {@const s = app.d.abilities[a]}
        <tr title={breakdown(s.breakdown)}>
          <th class="w-12 bg-head py-1 text-center text-sm text-head-ink opacity-100" style="print-color-adjust: exact">{a.toUpperCase()}</th>
          <td class="text-xl font-bold tabular-nums">{s.score}</td>
          <td class="text-xl font-bold tabular-nums"><span use:rollable={{ title: `${a.toUpperCase()} check`, bonus: s.hasTemp ? s.tempMod : s.mod, parts: [{ source: `${a.toUpperCase()} modifier`, value: s.hasTemp ? s.tempMod : s.mod }] }}>{fmt(s.mod)}</span></td>
          <td class="px-1"><div class="write-box h-7 leading-7 tabular-nums">{s.hasTemp ? s.tempScore : ''}</div></td>
          <td class="px-1"><div class="write-box h-7 leading-7 tabular-nums">{s.hasTemp ? fmt(s.tempMod) : ''}</div></td>
          <td class="px-1"><div class="h-7 print:rounded-sm print:border print:border-ink/30"><NumInput class="h-full w-full bg-field print:invisible" bind:value={app.char.abilities[a].temp} signed aria-label="{a} temporary change" /></div></td>
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
