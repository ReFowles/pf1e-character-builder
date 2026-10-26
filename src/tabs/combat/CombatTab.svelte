<script lang="ts">
  import CharacterInfo from './CharacterInfo.svelte';
  import LevelXp from './LevelXp.svelte';
  import CurrencyOverview from './CurrencyOverview.svelte';
  import AbilityScores from './AbilityScores.svelte';
  import ClassInfo from './ClassInfo.svelte';
</script>

<div class="sheet-grid combat-grid">
  <div data-section="logo" style:--area="logo" class="flex items-center justify-center">
    <img src="/pf-logo.svg" alt="Pathfinder Roleplaying Game" class="max-h-24 w-full object-contain" />
  </div>
  <CharacterInfo />
  <LevelXp />
  <CurrencyOverview />
  <AbilityScores />
  <ClassInfo />
</div>
