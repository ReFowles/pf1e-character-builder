<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import { addSpellBlock } from '../../lib/spellBlocks';
  import CastingBlock from './CastingBlock.svelte';

  const c = $derived(app.char);
</script>

<!-- One section per casting class; more can be added from Config. -->
<div class="flex flex-col gap-2">
  {#each c.spellcasting as block (block.id)}
    <CastingBlock {block} />
  {:else}
    <div class="flex flex-col items-start gap-2 rounded-md bg-paper p-4 text-sm print:hidden">
      <p class="italic opacity-70">No spellcasting yet. Add a section for each casting class (or "Other" for racial or item spells). You can also add sections from Config.</p>
      <button type="button" class="add-btn" onclick={() => addSpellBlock(c)}>+ Spellcasting section</button>
    </div>
  {/each}
</div>
