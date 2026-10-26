<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import MythicOverview from './MythicOverview.svelte';
  import MythicAbilities from './MythicAbilities.svelte';
  import MythicList from './MythicList.svelte';

  const m = $derived(app.char.mythic);
</script>

<div class="sheet-grid mythic-grid">
  <MythicOverview />
  <MythicAbilities />
  <MythicList id="mythicFeats" bind:items={m.feats} nameLabel="Mythic feat" addLabel="Mythic feat" empty="Mythic feats are gained at tiers 1, 3, 5, 7 and 9." />
  <MythicList id="mythicPathAbilities" bind:items={m.pathAbilities} nameLabel="Path ability" addLabel="Path ability" empty="One path ability per tier." />
  <MythicList id="mythicSpells" bind:items={m.spells} numberLabel="Level" nameLabel="Mythic spell" addLabel="Mythic spell" empty="Mythic versions of spells you know." />
</div>
