<script lang="ts">
  import { MYTHIC_PATHS } from '../../lib/model/types';
  import { PATH_HP } from '../../lib/rules/mythic';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import UsesTracker from '../../lib/ui/UsesTracker.svelte';

  const m = $derived(app.char.mythic);
  const dm = $derived(app.d.mythic);
</script>

<Section id="mythicOverview">
  {#snippet actions()}
    <button type="button" class="rounded-sm px-1.5 text-xs hover:bg-paper/20" onclick={() => (m.powerUsed = 0)}>New day</button>
  {/snippet}
  <div class="grid grid-cols-[5rem_1fr] gap-2">
    <Field label="Tier">
      <select bind:value={m.tier}>
        {#each { length: 10 }, i (i)}<option value={i + 1}>{i + 1}</option>{/each}
      </select>
    </Field>
    <Field label="Path">
      <select bind:value={m.path}>
        <option value="">—</option>
        {#each MYTHIC_PATHS as p (p)}<option value={p}>{p[0].toUpperCase() + p.slice(1)} ({PATH_HP[p]} hp/tier)</option>{/each}
      </select>
    </Field>
  </div>
  <div class="grid grid-cols-3 gap-1">
    <div class="stat">
      <div class="stat-value text-3xl">{dm?.surgeDie ?? '—'}</div>
      <div class="field-label">Surge die</div>
    </div>
    <div class="stat" title="Path hit points per tier × tier, added to max HP">
      <div class="stat-value text-3xl">+{dm?.hp ?? 0}</div>
      <div class="field-label">Mythic HP</div>
    </div>
    <div class="stat">
      <div class="stat-value text-3xl">{dm ? dm.powerMax - m.powerUsed : 0}<span class="text-sm opacity-60">/{dm?.powerMax ?? 0}</span></div>
      <div class="field-label">Mythic power</div>
    </div>
  </div>
  {#if dm}
    <div class="flex flex-col gap-1">
      <span class="field-label">Mythic power used today</span>
      <UsesTracker max={dm.powerMax} bind:used={m.powerUsed} label="Mythic power" />
    </div>
  {/if}
  <Field label="Notes"><textarea rows="2" bind:value={m.notes}></textarea></Field>
</Section>
