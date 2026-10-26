<script lang="ts">
  import Bio from './Bio.svelte';
  import Portrait from './Portrait.svelte';
  import Traits from './Traits.svelte';
  import Feats from './Feats.svelte';
  import ClassAbilities from './ClassAbilities.svelte';
  import Equipment from './Equipment.svelte';
  import MagicItems from './MagicItems.svelte';
</script>

<div class="sheet-grid character-grid">
  <Bio />
  <Portrait />
  <Traits />
  <Feats />
  <ClassAbilities />
  <Equipment />
  <MagicItems />
</div>
