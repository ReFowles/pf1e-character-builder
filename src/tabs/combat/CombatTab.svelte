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

  let left: HTMLDivElement;
  let right: HTMLDivElement;
  let specialWide = $state(false);

  // Special Abilities spans both columns when the right column ends above it
  // (the columns don't include it, so this can't feed back into itself).
  $effect(() => {
    const measure = () => (specialWide = right.offsetHeight <= left.offsetHeight);
    const ro = new ResizeObserver(measure);
    ro.observe(left);
    ro.observe(right);
    const print = matchMedia('print');
    print.addEventListener('change', measure);
    addEventListener('beforeprint', measure);
    return () => {
      ro.disconnect();
      print.removeEventListener('change', measure);
      removeEventListener('beforeprint', measure);
    };
  });
</script>

<!--
  Two columns on large screens and in print. On small screens the column
  wrappers become `display: contents` and sections are ordered by the mockup's
  numbered flow (see .core in app.css). Special Abilities sits under the left
  column, or across both when the right column is shorter.
-->
<div class="core" class:special-wide={specialWide}>
  <div class="core-left" bind:this={left}>
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
  </div>
  <div class="core-right" bind:this={right}>
    <div data-section="logo" class="flex items-center justify-center">
      <img src="/pf-logo.svg" alt="Pathfinder Roleplaying Game" class="max-h-24 w-full object-contain" />
    </div>
    <ClassInfo />
    <Readiness />
    <Skills />
  </div>
  <SpecialAbilities />
</div>
