<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Field from '../../lib/ui/Field.svelte';

  const bio = $derived(app.char.bio);
  const SHORT = ['age', 'gender', 'height', 'weight', 'build', 'skin', 'hair', 'eyes'] as const;
  const LONG = ['likes', 'dislikes', 'fears', 'goals'] as const;
</script>

<Section id="bio">
  {#snippet info()}
    <p>Free-form details about your character. Nothing here affects the numbers on the sheet.</p>
  {/snippet}
  <div class="grid grid-cols-3 gap-x-2 gap-y-1 sm:grid-cols-9">
    {#each SHORT as k (k)}
      <Field label={k}><input bind:value={bio[k]} /></Field>
    {/each}
    <Field label="Homeland" class="col-span-3 sm:col-span-1"><input bind:value={app.char.info.homeland} /></Field>
  </div>
  <div class="grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-4">
    {#each LONG as k (k)}
      <Field label={k}><textarea rows="2" bind:value={bio[k]}></textarea></Field>
    {/each}
  </div>
  <Field label="Backstory & notes"><textarea rows="2" bind:value={bio.backstory}></textarea></Field>
</Section>
