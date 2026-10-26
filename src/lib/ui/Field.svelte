<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    class?: string;
    children: Snippet;
  }
  let { label, class: cls = '', children }: Props = $props();
</script>

<label class="field {cls}">
  {@render children()}
  <span class="field-label">{label}</span>
</label>
