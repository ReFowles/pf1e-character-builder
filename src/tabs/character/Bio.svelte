<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import Field from '../../lib/ui/Field.svelte';

  const bio = $derived(app.char.bio);
  const SHORT = ['age', 'gender', 'height', 'weight', 'build', 'skin', 'hair', 'eyes'] as const;
  const LONG = ['likes', 'dislikes', 'fears', 'goals'] as const;
</script>

<Section id="bio">
  <div class="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
    {#each SHORT as k (k)}
      <Field label={k}><input bind:value={bio[k]} /></Field>
    {/each}
    <Field label="Homeland" class="col-span-2"><input bind:value={app.char.info.homeland} /></Field>
  </div>
  <div class="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
    {#each LONG as k (k)}
      <Field label={k}><textarea rows="2" bind:value={bio[k]}></textarea></Field>
    {/each}
  </div>
  <Field label="Backstory & notes"><textarea rows="3" bind:value={bio.backstory}></textarea></Field>
</Section>
