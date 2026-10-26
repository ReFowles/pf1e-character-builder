<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import { addCompanion } from '../../lib/companions';
  import CompanionSection from './CompanionSection.svelte';

  const c = $derived(app.char);
</script>

<!-- One section per companion; more can be added from Config. -->
<div class="flex flex-col gap-2">
  {#each c.companions as comp (comp.id)}
    <CompanionSection {comp} />
  {:else}
    <div class="flex flex-col items-start gap-2 rounded-md bg-paper p-4 text-sm print:hidden">
      <p class="italic opacity-70">No companions yet. Add a familiar, animal companion, eidolon or other creature. You can also add them from Config.</p>
      <button type="button" class="add-btn" onclick={() => addCompanion(c)}>+ Companion</button>
    </div>
  {/each}
</div>
