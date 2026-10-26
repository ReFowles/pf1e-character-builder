<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';

  const d = $derived(app.d);
  const ready = $derived(d.xpNext !== null && app.char.xp.current >= d.xpNext);
</script>

<Section id="level" bodyClass="justify-center">
  <div class="flex items-center gap-3">
    <div class="stat">
      <div class="stat-value text-2xl">{d.level}</div>
      <div class="field-label">Level</div>
    </div>
    <div class="flex flex-1 flex-col items-end">
      <div class="flex items-center justify-end gap-1 text-lg">
        <NumInput class="w-28 text-right" bind:value={app.char.xp.current} aria-label="Current experience" />
        <span class="opacity-60">/</span>
        <span class="tabular-nums" title="{app.char.xp.track} track (change in Config)">{d.xpNext?.toLocaleString() ?? '—'}</span>
      </div>
      <span class="field-label">
        Experience
        {#if ready}<span class="ml-1 rounded-sm bg-gold px-1 text-paper normal-case">Level up!</span>{/if}
      </span>
    </div>
  </div>
</Section>
