<script lang="ts">
  import { ABILITIES } from '../../lib/model/types';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';
  import { breakdown, fmt } from '../../lib/ui/format';
  import Chips from '../../lib/ui/Chips.svelte';
  import { CONDITIONS } from '../../lib/rules/conditions';

  const CONDITION_NAMES = Object.values(CONDITIONS).map((d) => d.name);

  let editing = $state(false);
  const PARTS = ['base', 'racial', 'enhancement', 'inherent', 'misc', 'temp'] as const;
</script>

<Section id="abilities">
  {#snippet actions()}
    <button type="button" class="rounded-sm px-1.5 text-xs hover:bg-paper/20" aria-pressed={editing} onclick={() => (editing = !editing)}>
      {editing ? 'Done' : 'Edit'}
    </button>
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
          <th class="w-12 bg-ink py-1 text-center text-sm text-paper opacity-100 print:bg-ink" style="print-color-adjust: exact">{a.toUpperCase()}</th>
          <td class="text-xl font-bold tabular-nums">{s.score}</td>
          <td class="text-xl font-bold tabular-nums">{fmt(s.mod)}</td>
          <td class="px-1 py-0.5"><div class="write-box h-7 leading-7 tabular-nums">{s.hasTemp ? s.tempScore : ''}</div></td>
          <td class="px-1 py-0.5"><div class="write-box h-7 leading-7 tabular-nums">{s.hasTemp ? fmt(s.tempMod) : ''}</div></td>
        </tr>
      {/each}
    </tbody>
  </table>
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
  <div class="mt-auto flex flex-col border-t border-ink/20 pt-1">
    <span class="field-label">Conditions</span>
    <Chips bind:items={app.char.conditions} suggestions={CONDITION_NAMES} placeholder="Add condition…" label="Add condition" />
    {#each app.d.conditionNotes as note (note)}
      <p class="text-xs opacity-70">{note}</p>
    {/each}
  </div>
</Section>
