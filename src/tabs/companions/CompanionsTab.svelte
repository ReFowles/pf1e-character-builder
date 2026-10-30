<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import { addCompanion } from '../../lib/companions';
  import CompanionSection from './CompanionSection.svelte';
  import EmptyState from '../../lib/ui/EmptyState.svelte';

  const c = $derived(app.char);
</script>

<!-- One section per companion; more can be added from Settings. -->
<div class="flex flex-col gap-2">
  {#each c.companions as comp (comp.id)}
    <CompanionSection {comp} />
  {:else}
    <EmptyState message="No companions yet. Add a familiar, animal companion, eidolon or other creature. You can also add them from Settings." action="Companion" onadd={() => addCompanion(c)} />
  {/each}
</div>
