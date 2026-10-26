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
  import { spillover } from '../../lib/ui/spillover';
</script>

<!--
  Two columns on large screens and in print: the left sections stack beside
  .core-right, and once it ends the remaining ones span both columns
  (lib/ui/spillover.ts). On small screens everything flows in the mockup's
  numbered order (see .core in app.css).
-->
<div class="core" use:spillover={{ keepNarrow: 2 }}>
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
  <div class="core-right">
    <div data-section="logo" class="flex items-center justify-center">
      <img src="/pf-logo.svg" alt="Pathfinder Roleplaying Game" class="max-h-24 w-full object-contain" />
    </div>
    <ClassInfo />
    <Readiness />
    <Skills />
  </div>
</div>
