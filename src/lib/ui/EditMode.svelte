<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useSection } from './sectionContext';

  // Reads the enclosing Section's edit state (context is only visible to
  // components rendered inside the Section) and hands it to the snippet.
  let { children }: { children: Snippet<[boolean]> } = $props();
  const section = useSection();
</script>

{@render children(section.editing)}
