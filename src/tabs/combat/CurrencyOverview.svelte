<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';

  const COINS = ['pp', 'gp', 'sp', 'cp'] as const;
  const carried = $derived(app.char.currency.carried);
  const gpValue = $derived(carried.pp * 10 + carried.gp + carried.sp / 10 + carried.cp / 100);
</script>

<Section id="currency">
  {#snippet info()}
    <p>Coins carried here count toward carried weight at 50 coins per pound.</p>
    <p>Stashes, pouches and bank accounts live in Equipment on the Character tab; mark them weightless so they don't add weight.</p>
    <p>1 pp = 10 gp, 1 gp = 10 sp, 1 sp = 10 cp.</p>
  {/snippet}
  <div class="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-0.5">
    {#each COINS as coin (coin)}
      <span class="field-label text-xs">{coin}</span>
      <NumInput class="text-right" bind:value={carried[coin]} aria-label="{coin} carried" />
    {/each}
  </div>
  <div class="text-xs opacity-70" title="Coins weigh 50 to the pound. Stored coins live on the Character tab.">
    ≈ {Math.round(gpValue * 100) / 100} gp on hand
  </div>
</Section>
