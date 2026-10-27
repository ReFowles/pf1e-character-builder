<script lang="ts">
  import { app } from '../../lib/state.svelte';
  import Section from '../../lib/ui/Section.svelte';
  import PortraitEditor from '../../lib/ui/PortraitEditor.svelte';
</script>

<Section id="portrait" bodyClass="p-0">
  {#snippet info()}
    <p>Click the frame (or drop an image on it), then drag to position the image and zoom to frame it. It's saved as a 600×800 (3:4) JPEG; transparent areas become white.</p>
  {/snippet}
  <PortraitEditor bind:portrait={app.char.portrait} name={app.char.info.name} class="w-full flex-1" />
</Section>
