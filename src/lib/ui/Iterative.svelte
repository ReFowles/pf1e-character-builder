<script lang="ts">
  interface Props {
    /** Attack bonuses joined by "/", e.g. "+11/+6/+1". */
    text: string;
  }
  let { text }: Props = $props();
  // "+15", "/+10", "/+5": each piece stays whole, so a line can only break before a slash.
  const pieces = $derived(text.split('/').map((p, i) => (i ? `/${p}` : p)));
</script>

{#each pieces as p, i (i)}<span class="inline-block whitespace-nowrap">{p}</span>{/each}
