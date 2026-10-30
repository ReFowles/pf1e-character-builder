<script lang="ts">
  import { COIN_KINDS } from '../../lib/model/types';
  import { round2 } from '../../lib/rules/math';
  import { coinsToGp } from '../../lib/rules/tables';
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import NumInput from '../../lib/ui/NumInput.svelte';

  const carried = $derived(app.char.currency.carried);
</script>

<Section id="currency">
  {#snippet info()}
    <p>Coins carried here count toward carried weight at 50 coins per pound.</p>
    <p>Stashes, pouches and bank accounts live in Equipment on the Character tab; mark them weightless so they don't add weight.</p>
    <p>1 pp = 10 gp, 1 gp = 10 sp, 1 sp = 10 cp.</p>
  {/snippet}
  <div class="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-0.5">
    {#each COIN_KINDS as coin (coin)}
      <span class="field-label text-xs">{coin}</span>
      <!-- On paper the amount is blanked and the box stays, to be filled in by hand. -->
      <div class="rounded-sm print:border print:border-ink/40">
        <NumInput class="text-right print:invisible" bind:value={carried[coin]} aria-label="{coin} carried" />
      </div>
    {/each}
  </div>
  <div class="text-xs opacity-70 print:hidden" title="Coins weigh 50 to the pound. Stored coins live on the Character tab.">
    ≈ {round2(coinsToGp(carried))} gp on hand
  </div>
</Section>
