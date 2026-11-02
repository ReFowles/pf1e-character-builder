<script lang="ts">
  import { useSection } from './sectionContext';

  // Shown after an empty placeholder, pointing at the section's Edit pencil where the add controls live.
  const section = useSection();
</script>

{#if section.editable}<span class="ml-1 whitespace-nowrap print:hidden">· <svg viewBox="0 0 20 20" fill="currentColor" class="inline size-3.5 align-[-2px]" aria-hidden="true"><path d="M13.6 2.6a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-9.2 9.2a1 1 0 0 1-.47.26l-4 1a1 1 0 0 1-1.21-1.21l1-4a1 1 0 0 1 .26-.47l9.82-9.58ZM12 6.4l-7 7-.5 2.1 2.1-.5 7-7L12 6.4Z" /></svg> to add</span>{/if}
