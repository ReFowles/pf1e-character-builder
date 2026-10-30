<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import { addSpellBlock } from '../../lib/spellBlocks';
  import CastingBlock from './CastingBlock.svelte';
  import EmptyState from '../../lib/ui/EmptyState.svelte';

  const c = $derived(app.char);
</script>

<!-- One section per casting class; more can be added from Settings. -->
<div class="flex flex-col gap-2">
  {#each c.spellcasting as block (block.id)}
    <CastingBlock {block} />
  {:else}
    <EmptyState message={'No spellcasting yet. Add a section for each casting class (or "Other" for racial or item spells). You can also add sections from Settings.'} action="Spellcasting section" onadd={() => addSpellBlock(c)} />
  {/each}
</div>
