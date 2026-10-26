<script lang="ts">
  import { MYTHIC_PATHS } from '../../lib/model/types';
  import { PATH_HP } from '../../lib/rules/mythic';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Field from '../../lib/ui/Field.svelte';
  import UsesTracker from '../../lib/ui/UsesTracker.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';

  const m = $derived(app.char.mythic);
  const dm = $derived(app.d.mythic);
</script>

<Section id="mythicOverview">
  {#snippet info()}
    <p><strong>Mythic power</strong> is 3 + 2 × tier ({dm?.powerMax ?? 0}/day). The <strong>surge die</strong> ({dm?.surgeDie ?? '—'}) grows at tiers 4, 7 and 10; each surge upgrade from a feat or ability raises it one step (d6 → d8 → d10 → d12 → 2d8 → 2d10 → 2d12).</p>
    <p><strong>Mythic Paragon</strong>: your tier is considered 2 higher ({dm?.effectiveTier ?? 0}) for the potency of mythic abilities, feats and spells, such as Amazing Initiative. It doesn't unlock abilities or greater spell versions early, add mythic power, or change the surge die.</p>
    <p><strong>Mythic hit points</strong> and ability score increases use your actual tier and first path ({dm?.hp ?? 0} hp).</p>
    <p>A second path from Dual Path only grants access to that path's abilities; record them under Path Abilities.</p>
  {/snippet}
  {#snippet actions()}
    <button type="button" class="rounded-sm px-1.5 text-xs hover:bg-paper/20" onclick={() => (m.powerUsed = 0)}>New day</button>
  {/snippet}
  <div class="grid grid-cols-[4.5rem_4.5rem_1fr_1fr] gap-2">
    <Field label="Tier">
      <select bind:value={m.tier}>
        {#each { length: 10 }, i (i)}<option value={i + 1}>{i + 1}</option>{/each}
      </select>
    </Field>
    <Field label="Surge upgr." class="text-center"><NumInput bind:value={m.surgeUpgrades} title="Steps the surge die is raised by feats or abilities" /></Field>
    <Field label="Path">
      <select bind:value={m.path}>
        <option value="">—</option>
        {#each MYTHIC_PATHS as p (p)}<option value={p}>{p[0].toUpperCase() + p.slice(1)} ({PATH_HP[p]} hp/tier)</option>{/each}
      </select>
    </Field>
    <Field label="Second path (Dual Path)">
      <select bind:value={m.secondPath}>
        <option value="">—</option>
        {#each MYTHIC_PATHS.filter((p) => p !== m.path) as p (p)}<option value={p}>{p[0].toUpperCase() + p.slice(1)}</option>{/each}
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
  <label
    class="inline-flex items-center gap-2 self-start text-sm"
    title="Your tier is considered 2 higher for determining the potency of mythic abilities, feats, and spells. This doesn't grant you access to mythic abilities or greater versions of mythic spells at a lower tier than you would normally need to be to get them, nor does it grant you additional uses of mythic power or adjust the dice you roll for your surge."
  >
    <input type="checkbox" bind:checked={m.paragon} /> Mythic Paragon
    {#if m.paragon}<span class="text-xs opacity-70">(tier {dm?.effectiveTier ?? 0} for potency)</span>{/if}
  </label>
  {#if dm}
    <div class="flex flex-wrap items-center gap-2">
      <span class="field-label">Mythic power used today</span>
      <UsesTracker max={dm.powerMax} bind:used={m.powerUsed} label="Mythic power" />
    </div>
  {/if}
  <Field label="Notes"><textarea rows="2" bind:value={m.notes}></textarea></Field>
</Section>
