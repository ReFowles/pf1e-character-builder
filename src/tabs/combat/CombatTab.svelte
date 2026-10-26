<script lang="ts">
  import CharacterInfo from './CharacterInfo.svelte';
  import CurrencyOverview from './CurrencyOverview.svelte';
  import AbilityScores from './AbilityScores.svelte';
  import ClassInfo from './ClassInfo.svelte';
  import Readiness from './Readiness.svelte';
  import Skills from './Skills.svelte';
  import HitPoints from './HitPoints.svelte';
  import Macros from './Macros.svelte';
  import Offense from './Offense.svelte';
  import Defense from './Defense.svelte';
  import SpecialAbilities from './SpecialAbilities.svelte';
</script>

<!--
  Two columns on large screens and in print. On small screens the column
  wrappers become `display: contents` and sections are ordered by the mockup's
  numbered flow (see .core in app.css).
-->
<div class="core">
  <div class="core-left">
    <div class="core-row core-row-info">
      <CharacterInfo />
      <CurrencyOverview />
    </div>
    <div class="core-row core-row-hp">
      <HitPoints />
      <AbilityScores />
    </div>
    <Macros />
    <Offense />
    <Defense />
    <SpecialAbilities />
  </div>
  <div class="core-right">
    <div data-section="logo" class="flex items-center justify-center">
      <img src="/pf-logo.svg" alt="Pathfinder Roleplaying Game" class="max-h-24 w-full object-contain" />
    </div>
    <ClassInfo />
    <Readiness />
    <Skills />
  </div>
</div>
